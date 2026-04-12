const logger = require("../middleware/logger");
const jobcategory = require("../models/jobcategory");

exports.readJobCategory = async (req, res) => {
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
      var totalDataCount = await jobcategory.countDocuments({
        is_deleted: false,
      });
      var allUsers = await jobcategory.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      var totalDataCount = await jobcategory.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });
      var allUsers = await jobcategory.aggregate([
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
    logger.accessLog.info("jobcategory fetch fail");
    res.send({
      statusCode: 200,
      message: "jobcategory fetch successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("jobcategory fetch fail");
    res.send({
      statusCode: 500,
      message: "jobcategory fetch fail",
      error: err,
    });
  }
};

exports.readAllJobCategory = async (req, res) => {
  try {
    const userData = await jobcategory.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("jobcategory fetch success");
    res.send({
      statusCode: 200,
      message: "jobcategory fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobcategory fetch fail");
    res.send({
      statusCode: 500,
      message: "jobcategory fetch fail",
      error: err,
    });
  }
};
exports.readJobCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await jobcategory.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("jobcategory fetch success");
    res.send({
      statusCode: 200,
      message: "jobcategory fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobcategory fetch fail");
    res.send({
      statusCode: 500,
      message: "jobcategory fetch fail",
      error: err,
    });
  }
};

exports.createJobCategory = async (req, res) => {
  try {
    const newJobCategory = await jobcategory.create(req.body);
    if (newJobCategory) {
      await newJobCategory.save();
      logger.accessLog.info("jobcategory create fail");
      res.send({
        statusCode: 200,
        message: "The job category has been created successfully",
        jobcategory: newJobCategory,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobcategory create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateJobCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateJobCategory = await jobcategory.findByIdAndUpdate(id, req.body);
    if (updateJobCategory) {
      await updateJobCategory.save();
      logger.accessLog.info("jobcategory update successfully");
      res.send({
        statusCode: 200,
        message: "The job category has been updated successfully",
        jobcategory: updateJobCategory,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobcategory update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteJobCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteJobCategory = await jobcategory.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("jobcategory delete successfully");
    res.send({
      statusCode: 200,
      message: "The job category has been deleted successfully",
      jobcategory: deleteJobCategory,
    });
  } catch (err) {
    logger.errorLog.error("jobcategory delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
