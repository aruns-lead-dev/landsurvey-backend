const logger = require("../middleware/logger");
const tax = require("../models/tax");

exports.readTax = async (req, res) => {
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
      var totalDataCount = await tax.countDocuments({ is_deleted: false });
      var allUsers = await tax.aggregate([
        { $match: { is_deleted: false } }, // Filter out deleted records
        { $sort: { createdAt: sortOrder } }, // Sorting dynamically
        { $skip: parseInt(data) }, // Skipping records for pagination
        { $limit: parseInt(per_page) }, // Limiting the number of records
      ]);
    } else {
      var totalDataCount = await tax.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });
      var allUsers = await tax.aggregate([
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
    logger.accessLog.info("tax fetch fail");
    res.send({
      statusCode: 200,
      message: "tax fetch successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("tax fetch fail");
    res.send({ statusCode: 500, message: "tax fetch fail", error: err });
  }
};

exports.readAllTax = async (req, res) => {
  try {
    const userData = await tax.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("tax fetch success");
    res.send({
      statusCode: 200,
      message: "tax fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("tax fetch fail");
    res.send({ statusCode: 500, message: "tax fetch fail", error: err });
  }
};

exports.readTaxById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await tax.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("tax fetch success");
    res.send({
      statusCode: 200,
      message: "tax fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("tax fetch fail");
    res.send({ statusCode: 500, message: "tax fetch fail", error: err });
  }
};

exports.createTax = async (req, res) => {
  try {
    const newTax = await tax.create(req.body);
    if (newTax) {
      await newTax.save();
      logger.accessLog.info("tax create success");
      res.send({
        statusCode: 200,
        message: "The tax has been created successfully.",
        tax: newTax,
      });
    }
  } catch (err) {
    logger.errorLog.error("tax create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateTax = async (req, res) => {
  try {
    const { id } = req.params;
    const updateTax = await tax.findByIdAndUpdate(id, req.body);
    if (updateTax) {
      await updateTax.save();
      logger.accessLog.info("tax update successfully");
      res.send({
        statusCode: 200,
        message: "The tax has been updated successfully",
        tax: updateTax,
      });
    }
  } catch (err) {
    logger.errorLog.error("tax update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteTax = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteTax = await tax.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("tax delete fail");
    res.send({
      statusCode: 200,
      message: "The tax has been deleted successfully",
      tax: deleteTax,
    });
  } catch (err) {
    logger.errorLog.error("tax delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
