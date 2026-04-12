const { signAccessToken } = require("../middleware/jwt");
const logger = require("../middleware/logger");
const bcrypt = require("bcrypt");
const user = require("../models/user");
const ejs = require("ejs");
const city = require("../models/city");
const clientattchment = require("../models/clientattchment");
const clientlocation = require("../models/clientlocation");
const clientcontact = require("../models/clientcontact");
const client = require("../models/client");
const job = require("../models/job");
const task = require("../models/task");
const jobcategory = require("../models/jobcategory");
const jobscope = require("../models/jobscope");
const jobstatus = require("../models/jobstatus");
const taskAdditionalField = require("../models/taskAdditionalField");
const taskContact = require("../models/taskContact");
const taskLegalAddress = require("../models/taskLegalAddress");
const tasklocation = require("../models/tasklocation");
const state = require("../models/state");
const paymentterm = require("../models/paymentterm");
const costiteam = require("../models/costiteam");
const fee = require("../models/fee");
const tax = require("../models/tax");
const office = require("../models/office");
const vehicle = require("../models/vehicle");
const clienttype = require("../models/clienttype");
const ratesheet = require("../models/ratesheet");
const { default: axios } = require("axios");
const token = require("../server");
const saltRounds = 10;
const OAuthClient = require("intuit-oauth");
const quickbook = require("../models/quickbook");
const nodemailer = require("nodemailer");
const { emailConfig } = require("../config/emailConfig");
const identitycounters = require("../models/identitycounters");
const { TOKEN_PIPELINE, CLIENT_PIPELINE } = require("../middleware/pipelines");
const crypto = require("crypto");

const { MongoClient } = require("mongodb");
const fs = require("fs");

const { exec } = require("child_process");
const path = require("path");
const cron = require("node-cron");
const QuickBooksHelper = require("../utils/quickbooksHelper");
const { EJSON } = require("bson"); // Import EJSON
const invoice = require("../models/invoice");
const taxcodes = require("../models/taxcodes");
const invoiceitems = require("../models/invoiceitems");

const isProduction = process.env.QB_IS_PRODUCTION === "1";

// Load environment variables based on the environment
const QB_CONFIG = {
  clientId: isProduction
    ? process.env.QB_CLIENTID_PRODUCTION
    : process.env.QB_CLIENTID,
  clientSecret: isProduction
    ? process.env.QB_CLIENTSECRET_PRODUCTION
    : process.env.QB_CLIENTSECRET,
  environment: isProduction
    ? process.env.QB_ENVIRONMENT_PRODUCTION
    : process.env.QB_ENVIRONMENT,
  redirectUri: isProduction
    ? process.env.QB_REDIRECTURI_PRODUCTION
    : process.env.QB_REDIRECTURI,
  companyId: isProduction
    ? process.env.QB_COMPANYID_PRODUCTION
    : process.env.QB_COMPANYID,
  baseUrl: isProduction
    ? process.env.QB_BASE_URL_PRODUCTION
    : process.env.QB_BASE_URL,
  webhook_verifier: isProduction
    ? process.env.QB_WEBHOOKS_VERIFIER_PRODUCTION
    : process.env.QB_WEBHOOKS_VERIFIER,
};

require("dotenv").config();

exports.DBEmpty = async (req, res) => {
  try {
    await city.deleteMany({});
    await clientattchment.deleteMany({});
    await clientlocation.deleteMany({});
    await clientcontact.deleteMany({});
    await clienttype.deleteMany({});
    await ratesheet.deleteMany({});
    await client.deleteMany({});
    await job.deleteMany({});
    await task.deleteMany({});
    await jobcategory.deleteMany({});
    await jobscope.deleteMany({});
    await jobstatus.deleteMany({});
    await taskAdditionalField.deleteMany({});
    await taskContact.deleteMany({});
    await taskLegalAddress.deleteMany({});
    await tasklocation.deleteMany({});
    await state.deleteMany({});
    await paymentterm.deleteMany({});
    await costiteam.deleteMany({});
    await fee.deleteMany({});
    await tax.deleteMany({});
    await office.deleteMany({});
    await vehicle.deleteMany({});
    res.send({ statusCode: 200, message: "Successfully Deleted Data" });
  } catch (error) {
    res.send({ statusCode: 400, message: "Error While Deleting Data" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await user.findOne({ email: email });
    if (!userData) {
      res.send({ statusCode: 404, message: "User Not Found" });
    } else {
      bcrypt.compare(password, userData.password, async function (err, result) {
        if (result) {
          const token = await signAccessToken({
            email: email,
            password: userData.password,
          });
          logger.accessLog.info("login successfully");
          res.send({ ...token, loginTime: new Date().getTime() });
        } else {
          logger.accessLog.info("login successfully");
          res.send({
            statusCode: 400,
            message: "Invalid Cradentials Check Again",
          });
        }
      });
    }
  } catch (err) {
    logger.errorLog.error("login fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};



exports.forgotPassword = async (req, res) => {
  try {
    const isUser = await user.findOne({ email: req.body.email });

    if (!isUser) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "No such user found" });
    }

    console.log(`${isUser.first_name} ${isUser.last_name} <${isUser.email}>`);

    // Generate token with 24-hour expiry
    const tokenTemp = token.stamp.setupToken(86400000, {
      email: isUser.email,
      id: isUser._id,
    });

    console.log(tokenTemp);

    // Configure transporter
    const transporter = nodemailer.createTransport(emailConfig);

    // Render EJS template for reset email
    const resetLink = `${process.env.FORNTEND_URL}/confirm-password/${tokenTemp}`;
    const emailTemplatePath = `${__dirname}/../views/email/resetPassword.ejs`;

    ejs.renderFile(emailTemplatePath, { resetLink }, async (err, data) => {
      if (err) {
        console.error("Error rendering EJS template:", err);
        return res
          .status(500)
          .json({ statusCode: 500, message: `Error: ${err.message}` });
      }

      // Email details
      const mailData = {
        from: `Elevated Land Surveying <${process.env.SMTP_EMAIL}>`,
        to: `${isUser.first_name} ${isUser.last_name} <${isUser.email}>`,
        subject: "Reset Password Link from Land Surveying",
        html: data,
      };

      // Send email
      try {
        const info = await transporter.sendMail(mailData);
        console.log("Email sent:", info);
        return res.status(200).json({
          statusCode: 200,
          message: `Reset link sent to ${isUser.email} successfully`,
          resetLink,
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        return res
          .status(500)
          .json({ statusCode: 500, message: `Error: ${emailError.message}` });
      }
    });
  } catch (error) {
    console.error("Error in forgotPassword function:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "An unexpected error occurred. Please try again later.",
      error: error.message,
    });
  }
};

exports.changePasswordFromForgot = async (req, res) => {
  try {
    const { id } = req.params;
    const solved = token.stamp.solveToken(id);

    const userId = solved.id;
    if (token.stamp.verifyToken(id)) {
      const { password } = req.body;
      bcrypt.genSalt(saltRounds, function (err, salt) {
        if (!err) {
          bcrypt.hash(password, salt, async function (err, hash) {
            if (!err) {
              const newUser = await user.findByIdAndUpdate(userId, {
                $set: { password: hash },
              });

              if (newUser) {
                await newUser.save();
                logger.accessLog.info("Password Chnage successfull");
                res.send({
                  statusCode: 200,
                  message: "Password Chnaged Successfully",
                  user: newUser,
                });
              }
            } else {
              console.log(err);
            }
          });
        } else {
          console.log(err);
        }
      });
    } else {
      res.send({
        statusCode: 500,
        message: "Reset link was expired try again and get new link",
      });
    }
  } catch (err) {
    logger.errorLog.error("Password Chnage fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.initializeQuickbookToken = async (req, res) => {


  const oauthClient = new OAuthClient({
    clientId: QB_CONFIG.clientId,
    clientSecret: QB_CONFIG.clientSecret,
    environment: QB_CONFIG.environment,
    redirectUri: QB_CONFIG.redirectUri,
  });

  const authUri = oauthClient.authorizeUri({
    scope: [
      OAuthClient.scopes.Accounting,
      // OAuthClient.scopes.Payment,
      OAuthClient.scopes.OpenId,
    ],
    state: "intuit-test",
  });

  res.send(authUri);
};

exports.quickbookCallback = async (req, res) => {

  const oauthClient = new OAuthClient({
    clientId: QB_CONFIG.clientId,
    clientSecret: QB_CONFIG.clientSecret,
    environment: QB_CONFIG.environment,
    redirectUri: QB_CONFIG.redirectUri,
  });

  const parseRedirect = req.url;


  // Exchange the auth code retrieved from the **req.url** on the redirectUri
  const abc = oauthClient
    .createToken(parseRedirect)
    .then(async function (authResponse) {
      const resToken = authResponse.getJson();

      const tokenData = await quickbook.aggregate([
        {
          $match: {
            refresh_token: resToken.refresh_token,
          },
        },
      ]);

      if (!tokenData.length) {
        const newRefreshToken = await quickbook.create({
          refresh_token: resToken.refresh_token,
        });
        return newRefreshToken;
      }
    })
    .catch(function (e) {
      console.error("The error message is :" + e);
      console.error(e.intuit_tid);
      return e.originalMessage;
    });
  res.send(abc);
};

exports.identitycounter = async (req, res) => {
  const { id } = req.params;
  try {
    const counterRelatedDataExists = await identitycounters.findOne({
      model: id,
    });
    let count = counterRelatedDataExists.count + 1;
    res.status(200).json({
      success: 200,
      count: `00${count}`,
    });
  } catch (error) {
    console.error("Error in identitycounter:", error);
    res.json({
      message: "An error occurred while fetching identity counter data.",
      error: error.message,
    });
  }
};

exports.ClientSyncQb = async (req, res) => {
  try {
    // Make the API call to QuickBooks
    const apiUrl = `${QB_CONFIG.baseUrl}/query?minorversion=69`;
    let response;
    let bodyData = "";
    response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      bodyData,
      "text"
    );

    let ResInvoice;
    let updatedTokens = [];
    try {
      ResInvoice = response;
      let Customer = ResInvoice?.QueryResponse?.Customer;

      await Promise.all(
        Customer.map(async (element) => {
          try {
            if (element?.PrimaryEmailAddr?.Address) {
              let companyName = element?.DisplayName.trim();

              const filter = {
                is_deleted: false,
                qb_customer_id: element.Id,
              };
              const update = {
                $set: {
                  qb_customer_id: element.Id,
                  is_maped: 1,
                  SyncToken: element?.SyncToken,
                },
              };

              const updatedToken = await client.findOneAndUpdate(
                filter,
                update,
                { timestamps: false }
              );
              updatedTokens.push(updatedToken); // Store the updated token in the array
            }
          } catch (error) {
            console.error("Error updating token for element:", error);
          }
        })
      );
    } catch (parseError) {
      console.error("Error parsing QuickBooks response:", parseError);
      return res.status(500).json({
        statusCode: 500,
        message: "Error parsing QuickBooks response",
        error: parseError,
      });
    }

    // Send success response
    res.status(200).json({
      statusCode: 200,
      message: "Clients fetched and QuickBooks data retrieved successfully",
      data: ResInvoice,
      // updatedTokens: updatedTokens
    });
  } catch (error) {
    console.error("Unexpected Error in fetchClient:", error);
    res.status(500).json({
      statusCode: 500,
      message: "An unexpected error occurred while fetching QuickBooks data",
      error: error.message || error,
    });
  }
};

exports.testApi = async (req, res) => {
  try {
    const apiUrl = `${QB_CONFIG.baseUrl}/query?minorversion=69`;

    // QuickBooks Query
    let bodyData = "";
    let body_text =
      "SELECT * FROM Customer WHERE DisplayName = '0839764 BC Ltd'";
    let response;
    // Make API Call
    response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      bodyData,
      "text",
      body_text
    );

    // Parse Response
    let ResInvoice;
    try {
      ResInvoice = response?.QueryResponse?.Customer || [];
    } catch (parseError) {
      console.error("Error parsing QuickBooks response:", parseError);
      return res.status(500).json({
        statusCode: 500,
        message: "Error parsing QuickBooks response",
        error: parseError,
      });
    }

    // Send Response
    res.status(200).json({
      statusCode: 200,
      message: "Clients fetched and QuickBooks data retrieved successfully",
      data: ResInvoice,
      response: response,
    });
  } catch (error) {
    console.error("Unexpected Error in fetchClient:", error);
    res.status(500).json({
      statusCode: 500,
      message: "An unexpected error occurred while fetching QuickBooks data",
      error: error.message || error,
    });
  }
};

exports.createClientSyncQb = async (req, res) => {
  // *** Develop a process to create clients in QuickBooks (QB)
  // *** who are present in our database but not yet created in the QuickBooks (QB).

  try {
    const userData = await client.aggregate([
      {
        $match: {
          is_deleted: false,
          is_maped: 0,
        },
      },
      ...CLIENT_PIPELINE,
    ]);

    const promises = userData.forEach(
      async ({
        company_name: companyName,
        company_email: companyEmail,
        locations,
        _id,
      }) => {
        const body = {
          FullyQualifiedName: companyName,
          PrimaryEmailAddr: {
            Address: companyEmail,
          },
          DisplayName: companyName,
          CompanyName: companyName,
          BillAddr: {
            CountrySubDivisionCode: "CA",
            City: locations?.[0]?.city,
            PostalCode: locations?.[0]?.postalCode ?? "94042",
            Line1: locations?.[0]?.muncipleAddress ?? "123 Main Street",
            Country: "CA",
          },
          GivenName: companyName,
        };

        const apiUrl = `${QB_CONFIG.baseUrl}/customer`;
        let response;
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
        const ResCustomerRef = response;

        await client.findByIdAndUpdate(
          _id,
          {
            $set: {
              qb_customer_id: ResCustomerRef.Customer.Id,
              SyncToken: ResCustomerRef?.Customer?.SyncToken,
              is_maped: 1,
            },
          },
          { new: true }
        );
      }
    );
    await Promise.all(promises);

    res.status(200).json({
      statusCode: 200,
      message: "Clients fetched and QuickBooks data retrieved successfully",
      userData: userData,
    });
  } catch (error) {
    console.error("Unexpected Error in fetchClient:", error);
    res.status(500).json({
      statusCode: 500,
      message: "An unexpected error occurred while fetching QuickBooks data",
      error: error.message || error,
    });
  }
};

async function processInvoiceUpdateWebhook(req) {
  // *** Develop and implement a webhook to handle invoice updates from QuickBooks. Whenever changes are made to an invoice in QB,
  // *** QuickBooks will trigger this API to update the corresponding data in our database

  try {
    var webhookPayload = JSON.stringify(req.body);
    const { eventNotifications } = req.body;
    const entity = eventNotifications[0].dataChangeEvent.entities[0];
    const qb_invoice_id = entity.id;
    var signature = req.get("intuit-signature");
    var hash = crypto
      .createHmac("sha256", QB_CONFIG.webhook_verifier)
      .update(webhookPayload)
      .digest("base64");

    if (signature !== hash) {
      console.warn("Signature missing in request headers");
      return;
    }

    if (signature === hash) {
      const invoiceData = await invoice.findOne({ qb_invoice_id });

      if (!invoiceData) {
        console.warn(
          `Invoice with ID ${qb_invoice_id} not found or already paid.`
        );
        return;
      }
      const url = `${QB_CONFIG.baseUrl}/invoice/${qb_invoice_id}`;
      const response = await QuickBooksHelper.makeQuickBooksApiGetCall(url);
      if (entity.operation === "Update") {
        if (invoiceData.client_ref_id != response?.Invoice?.CustomerRef.value) {
          let clientId = await client.findOne({
            qb_customer_id: response?.Invoice?.CustomerRef.value,
          });
          if (clientId) {
            await invoice.findOneAndUpdate(
              { qb_invoice_id: response?.Invoice?.Id },
              {
                client_ref_id: response?.Invoice?.CustomerRef.value,
                client_id: clientId._id,
              }
            );
          }
        }
        const updatedInvoice = await invoice.findOneAndUpdate(
          { qb_invoice_id: response?.Invoice?.Id }, // Search condition
          {
            total_cost: response?.Invoice?.TotalAmt,
            sub_total: (
              response?.Invoice?.TotalAmt -
              response?.Invoice?.TxnTaxDetail?.TotalTax
            ).toFixed(2),
            doc_number: response?.Invoice.DocNumber,
            is_paid: response?.Invoice.Balance ? 0 : 1,
            lines: response?.Invoice.Line,
            SyncToken: response?.Invoice.SyncToken,
            TxnDate: response?.Invoice?.TxnDate,
            qb_response: response?.Invoice,
          } // Update total cost
        );
      } else if (entity.operation === "Delete") {
        await invoice.findOneAndUpdate(
          { qb_invoice_id: response?.Invoice?.Id }, // Find by Id
          {
            is_deleted: true,
          }
        );
      }
    }
  } catch (err) {
    console.error("Error processing invoice update:", err);
  }
}

async function processClientUpdateWebhook(req) {
  // *** Develop and implement a webhook to handle client updates from QuickBooks. Whenever changes are made to client information in QB,
  // *** QuickBooks will trigger this API to update the SyncToken in our database.

  try {
    var webhookPayload = JSON.stringify(req.body);
    const { eventNotifications } = req.body;
    const entity = eventNotifications[0].dataChangeEvent.entities[0];
    const qb_customer_id = entity.id;
    var signature = req.get("intuit-signature");
    var hash = crypto
      .createHmac("sha256", QB_CONFIG.webhook_verifier)
      .update(webhookPayload)
      .digest("base64");
    if (signature !== hash) {
      console.warn("Signature missing in request headers");
      return;
    }

    if (signature === hash) {
      const ClientData = await client.findOne({
        qb_customer_id: qb_customer_id,
      });
      if (!ClientData) {
        console.warn(
          `Customer with ID ${qb_customer_id} not found or already paid.`
        );
        return;
      }

      const url = `${QB_CONFIG.baseUrl}/customer/${qb_customer_id}`;
      const response = await QuickBooksHelper.makeQuickBooksApiGetCall(url);
      const updatedclient = await client.findOneAndUpdate(
        { qb_customer_id: response.Customer.Id },
        {
          $set: { SyncToken: response.Customer.SyncToken }, // ✔ Save QuickBooks customer ID
        }
      );
    }
  } catch (err) {
    console.error("Error processing customer update:", err);
  }
}

async function processServiceItemsWebhook(req) {
  // *** Develop and implement a webhook to handle  Service Items updates from QuickBooks. Whenever changes are madein the Service Items in QB,
  // *** QuickBooks will trigger this API to update the data in our database.

  try {
    var webhookPayload = JSON.stringify(req.body);
    const { eventNotifications } = req.body;
    const entity = eventNotifications[0].dataChangeEvent.entities[0];
    const itemsId = entity.id;
    var signature = req.get("intuit-signature");
    var hash = crypto
      .createHmac("sha256", QB_CONFIG.webhook_verifier)
      .update(webhookPayload)
      .digest("base64");

    if (signature !== hash) {
      console.warn("Signature missing in request headers");
      return;
    }

    if (signature === hash) {
      const url = `${QB_CONFIG.baseUrl}/item/${itemsId}`;
      const response = await QuickBooksHelper.makeQuickBooksApiGetCall(url);
      let Item = response.Item;

      if (entity.operation === "Create") {
        await invoiceitems.create({
          Id: Item.Id,
          Name: Item.Name,
          UnitPrice: Item.UnitPrice || 0,
          SyncToken: Item.SyncToken,
        });
      } else if (entity.operation === "Update") {
        await invoiceitems.findOneAndUpdate(
          { Id: Item.Id }, // Find by Id
          {
            Name: Item.Name,
            UnitPrice: Item.UnitPrice || 0,
            SyncToken: Item.SyncToken,
          }
        );
      } else if (entity.operation === "Delete") {
        await invoiceitems.findOneAndUpdate(
          { Id: Item.Id }, // Find by Id
          {
            is_deleted: true,
          }
        );
      }
    }
  } catch (err) {
    console.error("Error processing Service Items:", err);
  }
}

async function processTaxCodesWebhook(req) {
  // *** Develop and implement a webhook to handle Tax updates from QuickBooks. Whenever changes are made in the Tax Codes in QB,
  // *** QuickBooks will trigger this API to update the data in our database.

  try {
    var webhookPayload = JSON.stringify(req.body);
    const { eventNotifications } = req.body;
    const entity = eventNotifications[0].dataChangeEvent.entities[0];
    const itemsId = entity.id;
    var signature = req.get("intuit-signature");
    var hash = crypto
      .createHmac("sha256", QB_CONFIG.webhook_verifier)
      .update(webhookPayload)
      .digest("base64");

    if (signature !== hash) {
      console.warn("Signature missing in request headers");
      return;
    }

    if (signature === hash) {
      const url = `${QB_CONFIG.baseUrl}/taxcode/${itemsId}`;
      const response = await QuickBooksHelper.makeQuickBooksApiGetCall(url);
      let item = response.TaxCode;

      if (entity.operation === "Create") {
        await taxcodes.create({
          Id: item.Id,
          Name: item.Name,
          Description: item.Description,
          SalesTaxRateList: item.SalesTaxRateList || {},
          PurchaseTaxRateList: item.PurchaseTaxRateList || {},
          SyncToken: item.SyncToken,
          Taxable: item.Taxable,
        });
      } else if (entity.operation === "Update") {
        await taxcodes.findOneAndUpdate(
          { Id: item.Id }, // Find by Id
          {
            Id: item.Id,
            Name: item.Name,
            Description: item.Description,
            SalesTaxRateList: item.SalesTaxRateList || {},
            PurchaseTaxRateList: item.PurchaseTaxRateList || {},
            SyncToken: item.SyncToken,
            Taxable: item.Taxable,
          }
        );
      } else if (entity.operation === "Delete") {
        await taxcodes.findOneAndUpdate(
          { Id: item.Id }, // Find by Id
          {
            is_deleted: true,
          }
        );
      }
    }
  } catch (err) {
    console.error("Error processing customer update:", err);
  }
}

// Main API handler for the webhook
exports.readWebookInvoice = async (req, res) => {
  // *** This is an api which is called by QB as webhook call

  try {
    // Respond immediately
    res.status(200).send({
      message: "Invoice update initiated successfully",
    });

    var webhookPayload = JSON.stringify(req.body);
    const { eventNotifications } = req.body;

    await Promise.all(
      eventNotifications[0].dataChangeEvent.entities.map(async (entity) => {
        switch (entity.name) {
          case "Customer":
            if (entity.operation === "Update") {
              await processClientUpdateWebhook(req);
            }
            break;
          case "Invoice":
            if (
              entity.operation === "Update" ||
              entity.operation === "Delete"
            ) {
              await processInvoiceUpdateWebhook(req);
            }
            break;
          case "Item":
            await processServiceItemsWebhook(req);
            break;
          case "TaxCode":
            await processTaxCodesWebhook(req);
            break;
        }
      })
    );
  } catch (err) {
    console.error("Error reading webhook:", err.message);
    res.status(500).send({
      message: "Something went wrong while processing the webhook",
      error: err.message,
    });
  }
};

exports.addLinesSyncDB = async (req, res) => {
  // *** This api is created for adding the Liens array and sync token in the invioce table.

  try {
    // Fetch invoices from the database
    const invoices = await invoice.find({ qb_invoice_id: { $ne: null } });

    if (!invoices.length) {
      return res.status(404).json({ message: "No invoices found." });
    }

    // Process each invoice
    const updates = invoices.map(async (inv) => {
      try {
        // Replace `209` with `inv.qb_invoice_id`
        const url = `${QB_CONFIG.baseUrl}/invoice/${inv.qb_invoice_id}`;
        const response = await QuickBooksHelper.makeQuickBooksApiGetCall(url);

        if (!response?.Invoice?.SyncToken) {
          throw new Error(
            `SyncToken not found for invoice ${inv.qb_invoice_id}`
          );
        }

        // Update invoice in DB
        return invoice.findOneAndUpdate(
          { qb_invoice_id: inv.qb_invoice_id },
          {
            SyncToken: response.Invoice.SyncToken,
            lines: response.Invoice.Line,
          }
        );
      } catch (err) {
        console.error(
          `Error updating invoice ${inv.qb_invoice_id}:`,
          err.message
        );
        return null;
      }
    });

    // Wait for all updates to complete
    const results = await Promise.all(updates);
    const successfulUpdates = results.filter(Boolean); // Remove failed ones

    return res.status(200).json({
      message: "Invoices synced successfully",
      updatedInvoices: successfulUpdates.length,
      details: successfulUpdates,
    });
  } catch (error) {
    console.error("Error syncing QuickBooks data:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const mongoUri = process.env.MONGO_URL;
const dbName = "land-servey";

// Generate a dynamic backup folder based on the current date & time
function getBackupFolder() {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
      .getHours()
      .toString()
      .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;
  // return path.join("D:", "backup", "land-servey", timestamp);
  return path.join("/var/www/html/DB_land_servey_backup", timestamp);
}

// Function to back up a single collection
async function backupCollection(db, collectionName, backupFolder) {
  try {
    const collection = db.collection(collectionName);
    const data = await collection.find({}).toArray();

    const outputPath = path.join(backupFolder, `${collectionName}.json`);
    // Use EJSON.stringify to retain ObjectId and Date types
    fs.writeFileSync(outputPath, EJSON.stringify(data, { indent: 2 }));

    console.log(`✅ Successfully backed up collection: ${collectionName}`);
  } catch (error) {
    console.error(`❌ Error backing up ${collectionName}:`, error);
  }
}

// API Route: Manually Trigger Backup
const databaseBackUp = async (req, res) => {
  try {
    await performBackup();
    res.json({ message: "✅ Backup completed!" });
  } catch (error) {
    console.error("❌ Backup failed:", error);
    res.status(500).json({ message: "Backup failed", error: error.message });
  }
};

// Function for Backup (Used in API & Cron)
async function performBackup() {
  console.log("Starting MongoDB backup...");

  const backupFolder = getBackupFolder();

  // Ensure the dynamic backup folder exists
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    if (!collections.length) {
      console.log("⚠️ No collections found in the database.");
      return;
    }

    for (const col of collections) {
      await backupCollection(db, col.name, backupFolder);
    }

    console.log(
      `✅ Full database backup completed! Files stored in: ${backupFolder}`
    );
  } catch (error) {
    console.error("❌ Error during backup:", error);
  } finally {
    await client.close();
  }
}

// Cron Job: Auto Backup Every 5 Minutes
const startCronJob = () => {
  // cron.schedule("*/5 * * * *", async () => { // Every 5 minutes
  cron.schedule("0 0 * * *", async () => {
    console.log("🕐 Running scheduled MongoDB backup...");
    await performBackup();
  });
  console.log("✅ Cron job initialized.");
};

// Start the cron job
startCronJob();

exports.getTaxCodes = async (req, res) => {
  try {
    const apiUrl = `${QB_CONFIG.baseUrl}/query?minorversion=69`;
    let response;
    let bodyData = "";
    let body_text = "select * from taxcode startposition 1 maxresults 20";
    response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      bodyData,
      "text",
      body_text
    );

    const ITEM_LIST = response?.QueryResponse?.TaxCode;

    await Promise.all(
      ITEM_LIST.map(async (item) => {
        await taxcodes.create({
          Id: item.Id,
          Name: item.Name,
          Description: item.Description,
          SalesTaxRateList: item.SalesTaxRateList || {},
          PurchaseTaxRateList: item.PurchaseTaxRateList || {},
          SyncToken: item.SyncToken,
          Taxable: item.Taxable,
        });
      })
    );

    res.status(200).json({
      statusCode: 200,
      message: "Invoice items fetched successfully",
      // ITEM_LIST: ITEM_LIST,
      response: response,
    });
  } catch (err) {
    console.error("Invoice fetch failed:", err);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to fetch the invoice",
      error: err.message,
    });
  }
};
