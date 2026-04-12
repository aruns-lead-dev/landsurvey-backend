const { default: mongoose } = require("mongoose");
const logger = require("../middleware/logger");
const { STATE_PIPELINE } = require("../middleware/pipelines");
const state = require("../models/state");
const constant = require("../utils/constant");
const errorFunction = require("../utils/errorFunction");
const { sendSuccessResponse } = require("../utils/response");

exports.readState = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortField = req.query.sortField === "undefined" ? "createdAt" : req.query.sortField;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;

    if (search === "") {
      var totalDataCount = await state.countDocuments({ is_deleted: false });
      var allUsers = await state.aggregate([
        { $match: { is_deleted: false } },
        ...STATE_PIPELINE,
        { $sort: { [sortField]: sortOrder, createdAt: -1 } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      var totalDataCount = await state.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });
      var allUsers = await state.aggregate([
        {
          $match: {
            name: { $regex: search, $options: "i" },
            is_deleted: false,
          },
        },
        ...STATE_PIPELINE,
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    }
    logger.accessLog.info("state fetch fail");
    res.send({
      statusCode: 200,
      message: "state fetch successfully",
      total: totalDataCount,
      statedata: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("state fetch fail");
    res.send({ statusCode: 500, message: "state fetch fail", error: err });
  }
};

exports.readAllState = async (req, res) => {
  try {
    const userData = await state.aggregate([
      { $match: { is_deleted: false } },
      ...STATE_PIPELINE,
      { $sort: { createdAt: -1 } },
    ]);
    logger.accessLog.info("state fetch success");
    res.send({
      statusCode: 200,
      message: "state fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("state fetch fail");
    res.send({ statusCode: 500, message: "state fetch fail", error: err });
  }
};

exports.readStateById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await state.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(id), is_deleted: false } },
      ...STATE_PIPELINE,
    ]);
    logger.accessLog.info("state fetch success");
    res.send({
      statusCode: 200,
      message: "state fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("state fetch fail");
    res.send({ statusCode: 500, message: "state fetch fail", error: err });
  }
};

exports.createState = async (req, res, next) => {
  try {
    const newState = await state.create(req.body);
    if (!newState) {
      res.status(403);
      return res.json(errorFunction(true, "Data Not Created"));
    } else {
      await newState.save();
      logger.accessLog.info("state create success");
      return sendSuccessResponse(res, {
        message: "The state has been created successfully",
        state: newState,
      });
    }
  } catch (err) {
    logger.errorLog.error(
      "Oops Something went wrong. Please contact the administrator."
    );
    res.send({
      status: 400,
      message: "Oops Something went wrong. Please contact the administrator",
    });
  }
};

exports.updateState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateState = await state.findByIdAndUpdate(id, req.body);

    if (updateState) {
      await updateState.save();
      logger.accessLog.info("state update fail");
      res.send({
        statusCode: 200,
        message: "The state has been updated successfully",
        state: updateState,
      });
    }
  } catch (err) {
    logger.errorLog.error("state update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteState = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteState = await state.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("state delete fail");
    res.send({
      statusCode: 200,
      message: "The state has been deleted successfully",
      state: deleteState,
    });
  } catch (err) {
    logger.errorLog.error("state delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
