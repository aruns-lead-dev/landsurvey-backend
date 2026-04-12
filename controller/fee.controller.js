const logger = require("../middleware/logger");
const fee = require("../models/fee");

exports.readFee = async (req, res) => {
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
      var totalDataCount = await fee.countDocuments({ is_deleted: false });
      var allUsers = await fee.aggregate([
        { $match: { is_deleted: false } }, // Filter out deleted records
        { $sort: { createdAt: sortOrder } }, // Sorting dynamically
        { $skip: parseInt(data) }, // Skipping records for pagination
        { $limit: parseInt(per_page) }, // Limiting the number of records
      ]);
    } else {
      var totalDataCount = await fee.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });

      var allUsers = await fee.aggregate([
        {
          $match: {
            is_deleted: false,
            name: { $regex: search, $options: "i" },
          }
        },
        { $sort: { createdAt: sortOrder } }, // Dynamic sorting
        { $skip: parseInt(data) }, // Skipping records for pagination
        { $limit: parseInt(per_page) } // Limiting the number of records
      ]);
    }
    logger.accessLog.info("fee fetch fail");
    res.send({
      statusCode: 200,
      message: "fee fetch successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("fee fetch fail");
    res.send({ statusCode: 500, message: "fee fetch fail", error: err });
  }
};

exports.readAllFee = async (req, res) => {
  try {
    const userData = await fee.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("fee fetch success");
    res.send({
      statusCode: 200,
      message: "fee fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("fee fetch fail");
    res.send({ statusCode: 500, message: "fee fetch fail", error: err });
  }
};

exports.readFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await fee.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("fee fetch success");
    res.send({
      statusCode: 200,
      message: "fee fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("fee fetch fail");
    res.send({ statusCode: 500, message: "fee fetch fail", error: err });
  }
};

exports.createFee = async (req, res) => {
  try {
    const newFee = await fee.create(req.body);
    if (newFee) {
      await newFee.save();
      logger.accessLog.info("fee create successfully");
      res.send({
        statusCode: 200,
        message: "The fee has been created successfully",
        fee: newFee,
      });
    }
  } catch (err) {
    logger.errorLog.error("fee create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFee = await fee.findByIdAndUpdate(id, req.body);
    if (updateFee) {
      await updateFee.save();
      logger.accessLog.info("fee update Successfully");
      res.send({
        statusCode: 200,
        message: "The fee has been updated successfully",
        fee: updateFee,
      });
    }
  } catch (err) {
    logger.errorLog.error("fee update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteFee = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteFee = await fee.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("fee delete successfully");
    res.send({
      statusCode: 200,
      message: "The fee has been deleted successfully",
      fee: deleteFee,
    });
  } catch (err) {
    logger.errorLog.error("fee delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
