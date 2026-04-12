const logger = require("../middleware/logger");
const { default: mongoose } = require("mongoose");
const dwr = require("../models/dwr");
const Jimp = require("jimp");
const { DWR_PIPELINE, TASK_PIPELINE } = require("../middleware/pipelines");
const { default: axios } = require("axios");
const { startOfDay, endOfDay } = require("date-fns");

exports.readDwr = async (req, res) => {
  try {
    var page = req?.query?.page ?? 1;
    var per_page = req?.query?.per_page ?? 10;
    var search = req.query.search;
    var sortField =
      req.query.sortField === "undefined" ? "status" : req.query.sortField;
    var sortOrder =
      req.query.sortOrder === "asc" || req.query.sortOrder === "undefined"
        ? 1
        : -1;
    var user_id = req.query.user_id;
    var staffApprove = req.query.staffApprove;
    let matchStage = { is_deleted: false };
    var start_date = req.query.startDate ?? null;
    var end_date = req.query.endDate ?? null;
    if (user_id) {
      if (staffApprove) {
        matchStage.$and = [
          { user_id: { $ne: mongoose.Types.ObjectId(user_id) } },
          { project_manager: mongoose.Types.ObjectId(user_id) },
        ];
      } else {
        matchStage.user_id = mongoose.Types.ObjectId(user_id);
      }
    }
    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    if (req.query.endDate && req.query.startDate) {
      const start = startOfDay(new Date(start_date));
      const end = endOfDay(new Date(end_date));
      matchStage.task_date = {
        $gte: start,
        $lt: end,
      };
    }
    const data = page * per_page - per_page;
    if (search === "") {
      // Handle sorting and pagination
      var alldwrs;
      if (sortField === "user_firstname") {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          {
            $addFields: {
              full_name: {
                $concat: ["$user_firstname", " ", "$user_lastname"],
              },
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by concatenated full_name
        ]);
      } else if (sortField === "project_manager") {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          {
            $addFields: {
              full_name: {
                $concat: [
                  "$project_manager_detail.first_name",
                  " ",
                  "$project_manager_detail.last_name",
                ],
              },
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by user_firstname
        ]);
      } else if (sortField === "status") {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          { $sort: { status: sortOrder, createdAt: -1 } },
        ]);
      } else {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          { $sort: { createdAt: sortOrder } },
        ]);
      }
    } else {
      if (sortField === "user_firstname") {
        var alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              user_full_name: {
                $concat: ["$user_firstname", " ", "$user_lastname"],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: "i" } },
                    { dwr_number: { $regex: search, $options: "i" } },
                    { job_number: { $regex: search, $options: "i" } },
                    {
                      "taskdata.number_str": { $regex: search, $options: "i" },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { user_firstname: sortOrder, createdAt: -1 } },
        ]);
      } else if (sortField === "project_manager") {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              full_name: {
                $concat: [
                  "$project_manager_detail.first_name",
                  " ",
                  "$project_manager_detail.last_name",
                ],
              },
            },
          },
          {
            $addFields: {
              user_full_name: {
                $concat: ["$user_firstname", " ", "$user_lastname"],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: "i" } },
                    { dwr_number: { $regex: search, $options: "i" } },
                    { job_number: { $regex: search, $options: "i" } },
                    {
                      "taskdata.number_str": { $regex: search, $options: "i" },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by user_firstname
        ]);
      } else if (sortField === "status") {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: "i" } },
                    { dwr_number: { $regex: search, $options: "i" } },
                    { job_number: { $regex: search, $options: "i" } },
                    {
                      "taskdata.number_str": { $regex: search, $options: "i" },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { status: sortOrder, createdAt: -1 } },
        ]);
      } else {
        var alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              user_full_name: {
                $concat: ["$user_firstname", " ", "$user_lastname"],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: "i" } },
                    { dwr_number: { $regex: search, $options: "i" } },
                    { job_number: { $regex: search, $options: "i" } },
                    {
                      "taskdata.number_str": { $regex: search, $options: "i" },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { createdAt: sortOrder } },
        ]);
      }
    }
    logger.accessLog.info("dwr fetch successfully");
    res.send({
      statusCode: 200,
      message: "The DWR has been fetched successfully",
      total: 0,
      data: alldwrs,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the DWR.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the DWR",
      error: err,
    });
  }
};

exports.readDwrById = async (req, res) => {
  try {
    const { id } = req.params;
    const dwrData = await dwr.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      ...DWR_PIPELINE,
    ]);
    logger.accessLog.info("dwr fetch success");
    res.send({
      statusCode: 200,
      message: "The DWR has been fetched successfully",
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the DWR.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the DWR",
      error: err,
    });
  }
};

exports.readAllDwr = async (req, res) => {
  try {
    const dwrData = await dwr.aggregate([
      {
        $match: { is_deleted: false },
      },
      ...DWR_PIPELINE,
    ]);
    dwrData.map(async (item) => {
      const updatedwrData = await dwr.findByIdAndUpdate(item._id, {
        task_date: item.task_date,
      });
    });
    logger.accessLog.info("dwr fetch success");
    res.send({
      statusCode: 200,
      message: "The DWR has been fetched successfully",
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the DWR.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the DWR",
      error: err,
    });
  }
};

exports.createDwr = async (req, res) => {
  try {
    const {
      task_id,
      user_id,
      task_name,
      task_date,
      task_hour,
      labourCosts,
      equipment,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_manager_id,
      project_managers_array,
    } = req.body;

    if (client_approved_DWR !== "") {
      const data = client_approved_DWR?.slice(22);
      const buffer = Buffer.from(data, "base64");
      req.body.client_approved_DWR = `${Date.now()}_${task_name}_dwr.png`;
      Jimp.read(buffer, async (error, res) => {
        if (error) {
          logger.errorLog.error(
            `error at catch from image generation : ${error}`
          );
        } else {
          res
            .quality(5)
            .write(
              __dirname +
              `/../public/dwr/attachments/${req.body.client_approved_DWR}`
            );
        }
      });
    } else {
      req.body.client_approved_DWR = "";
    }

    if (representative_sign !== "") {
      const representativedata = representative_sign?.slice(22);
      const representbuffer = Buffer.from(representativedata, "base64");
      req.body.representative_sign = `${Date.now()}_represent_${task_name}_dwr.png`;
      Jimp.read(representbuffer, async (error, res) => {
        if (error) {
          logger.errorLog.error(
            `error at catch from image generation : ${error}`
          );
        } else {
          res
            .quality(5)
            .write(
              __dirname +
              `/../public/dwr/signature/${req.body.representative_sign}`
            );
        }
      });
    } else {
      req.body.representative_sign = "";
    }

    if (client_representative_sign !== "") {
      const client_representativedata = client_representative_sign?.slice(22);
      const client_represent_buffer = Buffer.from(
        client_representativedata,
        "base64"
      );
      req.body.client_representative_sign = `${Date.now()}_clientrepresents_${task_name}_dwr.png`;
      Jimp.read(client_represent_buffer, async (error, res) => {
        if (error) {
          logger.errorLog.error(
            `error at catch from image generation : ${error}`
          );
        } else {
          res
            .quality(5)
            .write(
              __dirname +
              `/../public/dwr/signature/${req.body.client_representative_sign}`
            );
        }
      });
    } else {
      req.body.client_representative_sign = "";
    }

    const Promise_dwr = await labourCosts.map(async (item, index) => {
      const newdwr = await dwr.create({
        task_id: task_id,
        task_date: task_date,
        user_id: item.employee,
        task_hour: item.hours,
        submit_status: submit_status,
        client_representative: client_representative,
        billing_line_items: {
          labourCosts: [item],
          equipment: equipment,
        },
        submit_date: new Date().toISOString().split("T")[0],
        remark: remark,
        project_managers_array: project_managers_array,
        client_approved_DWR: req.body.client_approved_DWR,
        representative_sign: req.body.representative_sign,
        client_representative_sign: req.body.client_representative_sign,
      });
      await newdwr.save();
      await dwr.findByIdAndUpdate(newdwr._id, {
        $set: { dwr_number: newdwr.number.toString().padStart(6, "0") },
      });
      return newdwr;
    });
    Promise.all(Promise_dwr)
      .then((results) => {
        logger.accessLog.info("dwr create successfully");
        return res.send({
          statusCode: 200,
          message: "The DWR has been created successfully",
          dwr: Promise_dwr,
        });
      })
      .catch((error) => {
        console.error("One of the promises failed:", error);
        logger.errorLog.error("dwr create fail");
        return res.send({
          statusCode: 500,
          message:
            "Oops Something went wrong. Please contact the administrator",
          error: err,
        });
      });
  } catch (err) {
    logger.errorLog.error("dwr create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateDwr = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_id,
      task_name,
      task_date,
      task_hour,
      labourCosts,
      user_id,
      equipment,
      project_manager_id,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_managers_array,
    } = req.body;

    if (client_approved_DWR !== "") {
      if (client_approved_DWR.includes("dwr")) {
        req.body.client_approved_DWR = req.body.client_approved_DWR;
      } else {
        const data = client_approved_DWR?.slice(22);
        const buffer = Buffer.from(data, "base64");
        req.body.client_approved_DWR = `${Date.now()}_${task_name}_dwr.png`;
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
                `/../public/dwr/attachments/${req.body.client_approved_DWR}`
              );
          }
        });
      }
    } else {
      req.body.client_approved_DWR = "";
    }

    if (representative_sign !== "") {
      if (representative_sign.includes("dwr")) {
        req.body.representative_sign = req.body?.representative_sign;
      } else {
        const representativedata = representative_sign?.slice(22);
        const representbuffer = Buffer.from(representativedata, "base64");
        req.body.representative_sign = `${Date.now()}_represent_${task_name}_dwr.png`;
        Jimp.read(representbuffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                `/../public/dwr/signature/${req.body.representative_sign}`
              );
          }
        });
      }
    } else {
      req.body.representative_sign = "";
    }

    if (client_representative_sign !== "") {
      if (client_representative_sign.includes("dwr")) {
        req.body.client_representative_sign =
          req.body?.client_representative_sign;
      } else {
        const client_representativedata = client_representative_sign?.slice(22);
        const client_represent_buffer = Buffer.from(
          client_representativedata,
          "base64"
        );
        req.body.client_representative_sign = `${Date.now()}_clientrepresents_${task_name}_dwr.png`;
        Jimp.read(client_represent_buffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                `/../public/dwr/signature/${req.body.client_representative_sign}`
              );
          }
        });
      }
    } else {
      req.body.client_representative_sign = "";
    }

    const updatedwrData = await dwr.findByIdAndUpdate(id, {
      task_id: task_id,
      user_id: user_id,
      task_date: task_date,
      task_hour: task_hour,
      submit_status: submit_status,
      client_representative: client_representative,
      billing_line_items: {
        labourCosts: labourCosts,
        equipment: equipment,
      },
      project_manager_id: project_manager_id,
      project_managers_array: project_managers_array,
      remark: remark,
      client_approved_DWR: req.body.client_approved_DWR,
      representative_sign: req.body?.representative_sign,
      client_representative_sign: req.body.client_representative_sign,
    });
    if (updatedwrData) {
      await updatedwrData.save();
      logger.accessLog.info("dwr Update Successfully");
      res.send({
        statusCode: 200,
        message: "The DWR has been updated successfully",
        client: updatedwrData,
      });
    }
  } catch (err) {
    logger.errorLog.error("dwr update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateDwrAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_id,
      task_name,
      task_date,
      task_hour,
      labourCosts,
      user_id,
      equipment,
      project_manager_id,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_managers_array,
    } = req.body;
    if (client_approved_DWR !== "") {
      if (client_approved_DWR.includes("dwr")) {
        req.body.client_approved_DWR = req.body.client_approved_DWR;
      } else {
        const data = client_approved_DWR?.slice(22);
        const buffer = Buffer.from(data, "base64");
        req.body.client_approved_DWR = `${Date.now()}_${task_name}_dwr.png`;
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
                `/../public/dwr/attachments/${req.body.client_approved_DWR}`
              );
          }
        });
      }
    } else {
      req.body.client_approved_DWR = "";
    }

    if (representative_sign !== "") {
      if (representative_sign.includes("dwr")) {
        req.body.representative_sign = req.body?.representative_sign;
      } else {
        const representativedata = representative_sign?.slice(22);
        const representbuffer = Buffer.from(representativedata, "base64");
        req.body.representative_sign = `${Date.now()}_represent_${task_name}_dwr.png`;
        Jimp.read(representbuffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                `/../public/dwr/signature/${req.body.representative_sign}`
              );
          }
        });
      }
    } else {
      req.body.representative_sign = "";
    }

    if (client_representative_sign !== "") {
      if (client_representative_sign.includes("dwr")) {
        req.body.client_representative_sign =
          req.body?.client_representative_sign;
      } else {
        const client_representativedata = client_representative_sign?.slice(22);
        const client_represent_buffer = Buffer.from(
          client_representativedata,
          "base64"
        );
        req.body.client_representative_sign = `${Date.now()}_clientrepresents_${task_name}_dwr.png`;
        Jimp.read(client_represent_buffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                `/../public/dwr/signature/${req.body.client_representative_sign}`
              );
          }
        });
      }
    } else {
      req.body.client_representative_sign = "";
    }

    const updatedwrData = await dwr.findByIdAndUpdate(id, {
      task_id: task_id,
      task_date: task_date,
      user_id: labourCosts[0].employee,
      task_hour: labourCosts[0].hours,
      submit_status: submit_status,
      client_representative: client_representative,
      billing_line_items: {
        labourCosts: [labourCosts[0]],
        equipment: equipment,
      },
      project_managers_array: project_managers_array,
      remark: remark,
      client_approved_DWR: req.body.client_approved_DWR,
      representative_sign: req.body?.representative_sign,
      client_representative_sign: req.body.client_representative_sign,
    });
    const [deletePromise, updatePromise] = await Promise.all([
      updatedwrData,
    ]);

    if (deletePromise?.deletedCount > 0) {
      logger.accessLog.info("DWR deleted successfully");
    }

    if (labourCosts.length > 1) {
      const Promise_dwr = labourCosts.map(async (item, index) => {
        if (index !== 0) {
          const newdwr = await dwr.create({
            task_id: task_id,
            task_date: task_date,
            user_id: item.employee,
            task_hour: item.hours,
            submit_status: submit_status,
            client_representative: client_representative,
            billing_line_items: {
              labourCosts: [item],
              equipment: equipment,
            },
            submit_date: new Date().toISOString().split("T")[0],
            remark: remark,
            project_managers_array: project_managers_array,
            client_approved_DWR: req.body.client_approved_DWR,
            representative_sign: req.body.representative_sign,
            client_representative_sign: req.body.client_representative_sign,
          });
          await newdwr.save();
          await dwr.findByIdAndUpdate(newdwr._id, {
            $set: { dwr_number: newdwr.number.toString().padStart(6, "0") },
          });
        }
      });
      const allPromises = [Promise_dwr, updatedwrData];
      Promise.all(allPromises)
        .then((results) => { })
        .catch((error) => {
          console.error("One of the promises failed:", error);
        });
    }
    if (updatedwrData) {
      await updatedwrData.save();
      logger.accessLog.info("dwr Update Successfully");
      res.send({
        statusCode: 200,
        message: "The DWR has been updated successfully",
      });
    }
  } catch (err) {
    logger.errorLog.error("dwr update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateDwrStatus = async (req, res) => {
  try {
    const { status, estimateHour } = req.body;
    const { id } = req.params;
    let updateStatus = 0;
    if (status === "approve") {
      updateStatus = 1;
    } else {
      updateStatus = 2;
    }
    const dwrData = await dwr.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
    ]);

    let DwrDetails = dwrData[0].billing_line_items.labourCosts;
    DwrDetails[0].estimate_hour = estimateHour;
    const updatedwrData = await dwr.findByIdAndUpdate(id, {
      $set: {
        "billing_line_items.labourCosts": DwrDetails,
        status: updateStatus,
        estimate_hour: parseFloat(estimateHour),
      },
    });
    if (updatedwrData) {
      await updatedwrData.save();
      logger.accessLog.info("dwr status updated Successfully");
      res.send({
        statusCode: 200,
        message: "The DWR status has been updated successfully",
      });
    }
  } catch (err) {
    logger.errorLog.error("dwr status update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.getDwrHoursByTaskId = async (req, res) => {
  try {
    const { task_id } = req.params;
    const dwrData = await dwr.aggregate([
      {
        $match: {
          task_id: mongoose.Types.ObjectId(task_id),
          is_deleted: false,
          status: 1,
        },
      },
      {
        $group: {
          _id: "$task_id",
          totalHours: { $sum: "$task_hour" },
        },
      },
    ]);

    logger.accessLog.info("dwr fetch success");
    res.send({
      statusCode: 200,
      message: "The DWR has been fetched successfully",
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the DWR.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the DWR",
      error: err,
    });
  }
};

exports.deleteDwr = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedwrData = await dwr.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    if (deletedwrData) {
      await deletedwrData.save();
      logger.accessLog.info("dwr delete successfully");
      res.send({
        statusCode: 200,
        message: "The DWR has been deleted successfully",
        dwr: deletedwrData,
      });
    } else {
      res.send({
        statusCode: 404,
        message: "The DWR could not be found",
      });
    }
  } catch (err) {
    logger.errorLog.error("dwr delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
