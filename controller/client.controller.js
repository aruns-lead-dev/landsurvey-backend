const logger = require("../middleware/logger");
const client = require("../models/client");
const Jimp = require("jimp");
const clientlocation = require("../models/clientlocation");
const clientcontact = require("../models/clientcontact");
const clientattchment = require("../models/clientattchment");
const mongoose = require("mongoose");
const { CLIENT_PIPELINE, TOKEN_PIPELINE } = require("../middleware/pipelines");
const { default: axios } = require("axios");
const OAuthClient = require("intuit-oauth");
const quickbook = require("../models/quickbook");
const QuickBooksHelper = require("../utils/quickbooksHelper");
const getSubdivisionCodeWithoutCountry = require("../utils/getStateCode");

const isProduction = process.env.QB_IS_PRODUCTION === '1';

// Load environment variables based on the environment
const QB_CONFIG = {
  clientId: isProduction ? process.env.QB_CLIENTID_PRODUCTION : process.env.QB_CLIENTID,
  clientSecret: isProduction ? process.env.QB_CLIENTSECRET_PRODUCTION : process.env.QB_CLIENTSECRET,
  environment: isProduction ? process.env.QB_ENVIRONMENT_PRODUCTION : process.env.QB_ENVIRONMENT,
  redirectUri: isProduction ? process.env.QB_REDIRECTURI_PRODUCTION : process.env.QB_REDIRECTURI,
  companyId: isProduction ? process.env.QB_COMPANYID_PRODUCTION : process.env.QB_COMPANYID,
  baseUrl: isProduction ? process.env.QB_BASE_URL_PRODUCTION : process.env.QB_BASE_URL,
};

exports.readClients = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === "") {
      var totalDataCount = await client.countDocuments({ is_deleted: false });
      var allClients = await client.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...CLIENT_PIPELINE,
      ]);
    } else {
      var totalDataCount = await client.countDocuments({
        $and: [
          { is_deleted: false },
          {
            $or: [
              { company_name: { $regex: search, $options: "i" } },
              { number_str: { $regex: search } },
            ],
          },
        ],
      });
      var allClients = await client.aggregate([
        {
          $match: {
            $and: [
              { is_deleted: false },
              {
                $or: [
                  { company_name: { $regex: search, $options: "i" } },
                  { number_str: { $regex: search } },
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...CLIENT_PIPELINE,
      ]);
    }
    logger.accessLog.info("client fetch successfully");
    res.send({
      statusCode: 200,
      message: "The client has been fetched successfully",
      total: totalDataCount,
      data: allClients,
    });
  } catch (err) {
    logger.errorLog.error("client fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the client",
      error: err,
    });
  }
};

exports.readClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const clientData = await client.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      { $sort: { createdAt: -1 } },
      ...CLIENT_PIPELINE,
    ]);
    logger.accessLog.info("client fetch success");
    res.send({
      statusCode: 200,
      message: "The client has been fetched successfully",
      data: clientData,
    });
  } catch (err) {
    logger.errorLog.error("client fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the client",
      error: err,
    });
  }
};

exports.readAllClient = async (req, res) => {
  try {
    const userData = await client.aggregate([
      {
        $match: { is_deleted: false },
      },
      { $sort: { company_name: 1 } },
      ...CLIENT_PIPELINE,
    ]);
    logger.accessLog.info("client fetch success");
    res.send({
      statusCode: 200,
      message: "The client has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("client fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the client",
      error: err,
    });
  }
};

exports.createClient = async (req, res) => {
  try {
    const {
      active,
      clientType,
      payment,
      locations,
      attachments,
      contacts,
      remark,
      companyEmail,
    } = req.body;
    let companyName = req.body.companyName.trim();
    const GET_STATE_CODE = getSubdivisionCodeWithoutCountry(
      locations[0].stateprovince
    );
    const body = {
      PrimaryEmailAddr: {
        Address: companyEmail,
      },
      DisplayName: companyName,
      BillAddr: {
        CountrySubDivisionCode: GET_STATE_CODE
          ? GET_STATE_CODE.isoCode + ", "
          : "BC",
        City: locations?.[0]?.city,
        PostalCode: locations?.[0]?.postalCode ?? "94042",
        Line1: locations?.[0]?.muncipleAddress ?? "123 Main Street",
        Country: GET_STATE_CODE ? GET_STATE_CODE.countryCode : "CA",
      },
    };

    const api = `${QB_CONFIG.baseUrl}/query?minorversion=69`;

    // QuickBooks Query
    let bodyData = "";
    let body_text = `SELECT * FROM Customer WHERE DisplayName = '${companyName}'`;
    let response;
    // Make API Call
    response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      api,
      bodyData,
      "text",
      body_text
    );
    if (
      response.Fault &&
      response.Fault.Error &&
      response.Fault.Error.length > 0
    ) {
      return res.send({
        statusCode: 500,
        message:
          `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
          "Oops Something went wrong. Please contact the administrator---",
      });
    }

    response = response?.QueryResponse?.Customer ? { Customer: response?.QueryResponse?.Customer?.[0] } : ''
    if (response) {
      const existingClient = await client.findOne({ qb_customer_id: response.Customer.Id });
      if (existingClient) {
        return res.send({
          statusCode: 500,
          message: "Client Duplicate Name Exists Error",
        });
      }
    }

    if (!response) {
      const apiUrl = `${QB_CONFIG.baseUrl}/customer`;
      response = await QuickBooksHelper.makeQuickBooksApiPostCall(
        apiUrl,
        body
      );

      if (
        response.Fault &&
        response.Fault.Error &&
        response.Fault.Error.length > 0
      ) {
        return res.send({
          statusCode: 500,
          message:
            `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
            "Oops Something went wrong. Please contact the administrator",
        });
      }
    }

    const newClient = await client.create({
      company_name: companyName,
      company_email: companyEmail,
      client_type: clientType,
      payment_terms: payment,
      active: active,
      remark: remark,
    });
    if (newClient) {
      locations.map(async (locationItem) => {
        const {
          locationName,
          muncipleAddress,
          stateprovince,
          postalCode,
          city,
          stateprovince_id,
          city_id,
        } = locationItem;
        const newLocation = await clientlocation.create({
          name: locationName,
          munciple_address: muncipleAddress,
          state: stateprovince,
          state_id: stateprovince_id,
          postal_code: postalCode,
          city: city,
          city_id: city_id,
          client_id: newClient._id,
        });
        if (newLocation) {
          await newLocation.save();
        }
      });
      contacts.map(async (contactItem) => {
        const {
          firstName,
          lastName,
          position,
          department,
          location,
          email,
          phone,
          cell,
          remark,
        } = contactItem;
        const newContact = await clientcontact.create({
          first_name: firstName,
          last_name: lastName,
          position: position,
          department: department,
          location: location,
          email: email,
          phone: phone,
          cell: cell,
          remark: remark,
          client_id: newClient._id,
        });
        if (newContact) {
          await newContact.save();
        }
      });
      attachments.map(async (attachmentItem, index) => {
        const { description, image } = attachmentItem;
        const data = image?.slice(22);
        const buffer = Buffer.from(data, "base64");
        Jimp.read(buffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                `/../public/client/attachments/${newClient._id}_${index}.png`
              );
          }
        });
        const newAttachment = await clientattchment.create({
          description: description,
          file_name: `${newClient._id}_${index}.png`,
          client_id: newClient._id,
        });
        if (newAttachment) {
          await newAttachment.save();
        }
      });
      await newClient.save();
      await client.findByIdAndUpdate(newClient._id, {
        $set: {
          number_str: newClient.number.toString().padStart(6, "0"),
        },
      });

      await client.findByIdAndUpdate(newClient._id, {
        $set: {
          qb_customer_id: response.Customer.Id,
          SyncToken: response.Customer.SyncToken,
        },
      });

      logger.accessLog.info("client create successfully");
      res.send({
        statusCode: 200,
        message: "The client has been created successfully",
        client: newClient,
      });
    }
  } catch (err) {
    logger.errorLog.error("client create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      active,
      clientType,
      payment,
      locations,
      attachments,
      contacts,
      remark,
      companyEmail,
    } = req.body;
    const GET_STATE_CODE = getSubdivisionCodeWithoutCountry(
      locations[0].stateprovince
    );
    let companyName = req.body.companyName.trim();
    const userData = await client.findOne({ _id: id, is_deleted: false });

    async function syncDataWithDatabase(clientId, incomingData, model) {
      const incomingIds = incomingData.map((item) => item._id);
      const existingRecords = await model.find({ client_id: clientId });
      const existingIds = existingRecords.map((record) =>
        record._id.toString()
      );
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await model.deleteMany({ _id: { $in: idsToDelete } });
      }
    }

    // Call the function for each type of data
    await syncDataWithDatabase(id, locations, clientlocation); // Sync locations
    await syncDataWithDatabase(id, contacts, clientcontact); // Sync contacts
    await syncDataWithDatabase(id, attachments, clientattchment); // Sync attachments

    const body = {
      Id: userData?.qb_customer_id,
      SyncToken: userData?.SyncToken,
      PrimaryEmailAddr: {
        Address: companyEmail,
      },
      DisplayName: companyName,
      BillAddr: {
        CountrySubDivisionCode: GET_STATE_CODE
          ? GET_STATE_CODE.isoCode + ", "
          : "BC ",
        City: locations?.[0]?.city,
        PostalCode: locations?.[0]?.postalCode ?? "94042",
        Line1: locations?.[0]?.muncipleAddress ?? "123 Main Street",
        Country: GET_STATE_CODE ? GET_STATE_CODE.countryCode : "CA",
      },
    };
    const apiUrl = `${QB_CONFIG.baseUrl}/customer`;
    const response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      body
    );
    if (
      response.Fault &&
      response.Fault.Error &&
      response.Fault.Error.length > 0
    ) {
      return res.send({
        statusCode: 500,
        message:
          `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
          "Oops Something went wrong. Please contact the administrator",
      });
    }
    const updateClientData = await client.findByIdAndUpdate(id, {
      company_name: companyName,
      company_email: companyEmail,
      client_type: clientType,
      // rate_sheet: ratesheet,
      payment_terms: payment,
      active: active,
      remark: remark,
      SyncToken: response.Customer.SyncToken,
      qb_customer_id: response.Customer.Id,
    });

    if (updateClientData) {
      if (updateClientData) {
        locations.map(async (locationItem) => {
          const {
            _id, // Assuming `id` is passed in locationItem to identify existing records
            locationName,
            muncipleAddress,
            stateprovince,
            postalCode,
            city,
            stateprovince_id,
            city_id,
          } = locationItem;

          // Define the location data to be used for both create and update
          const locationData = {
            name: locationName,
            munciple_address: muncipleAddress,
            state: stateprovince,
            state_id: stateprovince_id,
            postal_code: postalCode,
            city: city,
            city_id: city_id,
            client_id: updateClientData._id,
          };

          if (_id) {
            // Update the existing location if ID is present
            await clientlocation.findByIdAndUpdate(
              _id,
              { $set: locationData },
              { new: true, upsert: true } // `upsert` ensures a record is created if it doesn't exist
            );
          } else {
            // Create a new location if ID is not present
            const newLocation = new clientlocation(locationData);
            await newLocation.save();
          }
        });
      }

      if (updateClientData) {
        // Handle Contacts
        await Promise.all(
          contacts.map(async (contactItem) => {
            const {
              _id, // Assuming `id` is included to identify existing records
              firstName,
              lastName,
              position,
              department,
              location,
              email,
              phone,
              cell,
              remark,
            } = contactItem;

            const contactData = {
              first_name: firstName,
              last_name: lastName,
              position: position,
              department: department,
              location: location,
              email: email,
              phone: phone,
              cell: cell,
              remark: remark,
              client_id: updateClientData._id,
            };

            if (_id) {
              // Update existing contact
              await clientcontact.findByIdAndUpdate(
                _id,
                { $set: contactData },
                { new: true, upsert: true }
              );
            } else {
              // Create new contact
              const newContact = new clientcontact(contactData);
              await newContact.save();
            }
          })
        );

        // Handle Attachments
        await Promise.all(
          attachments.map(async (attachmentItem, index) => {
            const { _id, description, image } = attachmentItem; // Assuming `id` is included for updates
            const data = image.slice(22);
            const buffer = Buffer.from(data, "base64");

            const fileName = `${updateClientData._id}_${index}.png`;
            const attachmentPath = `${__dirname}/../public/client/attachments/${fileName}`;

            // Process and save image
            await new Promise((resolve, reject) => {
              Jimp.read(buffer, (error, res) => {
                if (error) {
                  logger.errorLog.error(
                    `Error at image generation: ${error.message}`
                  );
                  return reject(error);
                }
                res.quality(5).write(attachmentPath, () => resolve());
              });
            });

            const attachmentData = {
              description: description,
              file_name: fileName,
              client_id: updateClientData._id,
            };

            if (_id) {
              // Update existing attachment
              await clientattchment.findByIdAndUpdate(
                _id,
                { $set: attachmentData },
                { new: true, upsert: true }
              );
            } else {
              // Create new attachment
              const newAttachment = new clientattchment(attachmentData);
              await newAttachment.save();
            }
          })
        );

        // Save the updated client data
        await updateClientData.save();
      }

      logger.accessLog.info("client update successfully");
      res.send({
        statusCode: 200,
        message: "The client has been updated successfully",
        client: updateClientData,
      });
    }
  } catch (err) {
    logger.errorLog.error("client update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    await clientlocation.updateMany(
      { client_id: id },
      { $set: { is_deleted: true } }
    );
    await clientcontact.updateMany(
      { client_id: id },
      { $set: { is_deleted: true } }
    );
    await clientattchment.updateMany(
      { client_id: id },
      { $set: { is_deleted: true } }
    );
    const deleteClientData = await client.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("client delete successfully");
    res.send({
      statusCode: 200,
      message: "The client has been deleted successfully",
      client: deleteClientData,
    });
  } catch (err) {
    logger.errorLog.error("client delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
