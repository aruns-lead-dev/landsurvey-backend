const logger = require("../middleware/logger");
const jobstatus = require("../models/jobstatus");

exports.readJobStatus = async (req, res) => {
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
      var totalDataCount = await jobstatus.countDocuments({
        is_deleted: false,
      });

      var allUsers = await jobstatus.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      var totalDataCount = await jobstatus.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });

      var allUsers = await jobstatus.aggregate([
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
    logger.accessLog.info("jobstatus fetch fail");
    res.send({
      statusCode: 200,
      message: "jobstatus fetch successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("jobstatus fetch fail");
    res.send({ statusCode: 500, message: "jobstatus fetch fail", error: err });
  }
};

exports.readAllJobStatus = async (req, res) => {
  try {
    const userData = await jobstatus.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("jobstatus fetch success");
    res.send({
      statusCode: 200,
      message: "jobstatus fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobstatus fetch fail");
    res.send({ statusCode: 500, message: "jobstatus fetch fail", error: err });
  }
};

exports.readJobStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await jobstatus.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("jobstatus fetch success");
    res.send({
      statusCode: 200,
      message: "jobstatus fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobstatus fetch fail");
    res.send({ statusCode: 500, message: "jobstatus fetch fail", error: err });
  }
};

exports.createJobStatus = async (req, res) => {
  try {
    const newJobStatus = await jobstatus.create(req.body);
    if (newJobStatus) {
      await newJobStatus.save();
      logger.accessLog.info("jobstatus create successfully");
      res.send({
        statusCode: 200,
        message: "The job status has been created successfully",
        jobstatus: newJobStatus,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobstatus create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updateJobStatus = await jobstatus.findByIdAndUpdate(id, req.body);
    if (updateJobStatus) {
      await updateJobStatus.save();
      logger.accessLog.info("jobstatus update successfully");
      res.send({
        statusCode: 200,
        message: "The job status has been updated successfully",
        jobstatus: updateJobStatus,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobstatus update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteJobStatus = await jobstatus.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("jobstatus delete fail");
    res.send({
      statusCode: 200,
      message: "The job status has been deleted successfully",
      jobstatus: deleteJobStatus,
    });
  } catch (err) {
    logger.errorLog.error("jobstatus delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
