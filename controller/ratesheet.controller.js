const { default: axios } = require("axios");
const logger = require("../middleware/logger");
const ratesheet = require("../models/ratesheet");
const quote = require("../models/quote");
const task = require("../models/task");
const { default: mongoose } = require("mongoose");

exports.readRatesheet = async (req, res) => {
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
      var totalDataCount = await ratesheet.countDocuments({
        is_deleted: false,
      });
      var allUsers = await ratesheet
        .find({ is_deleted: false })
        .skip(data)
        .limit(per_page)
        .sort({ createdAt: sortOrder });
    } else {
      var totalDataCount = await ratesheet.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });
      var allUsers = await ratesheet
        .find({ name: { $regex: search, $options: "i" }, is_deleted: false })
        .skip(data)
        .limit(per_page)
        .sort({ createdAt: sortOrder });
    }
    logger.accessLog.info("ratesheet fetch fail");
    res.send({
      statusCode: 200,
      message: "The ratesheet has been fetched successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("ratesheet fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the ratesheet",
      error: err,
    });
  }
};

exports.readAllRatesheet = async (req, res) => {
  try {
    const userData = await ratesheet.find({ is_deleted: false });
    logger.accessLog.info("ratesheet fetch success");
    res.send({
      statusCode: 200,
      message: "The ratesheet has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("ratesheet fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the ratesheet",
      error: err,
    });
  }
};

exports.readRatesheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await ratesheet.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("ratesheet fetch success");
    res.send({
      statusCode: 200,
      message: "The ratesheet has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("ratesheet fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the ratesheet",
      error: err,
    });
  }
};

exports.createRatesheet = async (req, res) => {
  try {
    const { name, remark, active, labourItem, materialItem, fixItem } =
      req.body;
    const newRatesheet = await ratesheet.create({
      name: name,
      remark: remark,
      active: active,
      billable_line_items: {
        labourItem: labourItem,
        materialItem: materialItem,
        fixItem: fixItem,
      },
    });
    if (newRatesheet) {
      await newRatesheet.save();
      logger.accessLog.info("ratesheet create successfully");
      res.send({
        statusCode: 200,
        message: "The ratesheet has been created successfully",
        ratesheet: newRatesheet,
      });
    }
  } catch (err) {
    logger.errorLog.error("Failed to create the ratesheet.");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateRatesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, remark, active, labourItem, materialItem, fixItem } =
      req.body;
    const updateRatesheet = await ratesheet.findByIdAndUpdate(id, {
      name: name,
      remark: remark,
      active: active,
      billable_line_items: {
        labourItem: labourItem,
        materialItem: materialItem,
        fixItem: fixItem,
      },
    });
    if (updateRatesheet) {
      await updateRatesheet.save();
      logger.accessLog.info("ratesheet update fail");
      res.send({
        statusCode: 200,
        message: "The ratesheet has been updated successfully",
        ratesheet: updateRatesheet,
      });
    }
  } catch (err) {
    logger.errorLog.error("ratesheet update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteRatesheet = async (req, res) => {
  try {
    const { id } = req.params;

    const QuoteRelatedDataExists = await quote.findOne({
      ratesheet_id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    }); // Replace 'job_id' with the actual field name
    if (QuoteRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message: "Cannot delete. The ratesheet is referenced in the Quote collection",
      });
    }
    const TaskRelatedDataExists = await task.findOne({
      ratesheet_id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    }); // Replace 'job_id' with the actual field name
    if (TaskRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message: "Cannot delete. The ratesheet is referenced in the task collection",
      });
    }

    const deleteRatesheet = await ratesheet.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("ratesheet delete fail");
    res.send({
      statusCode: 200,
      message: "The ratesheet has been deleted successfully",
      ratesheet: deleteRatesheet,
    });
  } catch (err) {
    logger.errorLog.error("ratesheet delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
