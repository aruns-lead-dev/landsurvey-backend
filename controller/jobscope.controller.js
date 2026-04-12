const logger = require("../middleware/logger");
const jobscope = require("../models/jobscope");

exports.readJobScope = async (req, res) => {
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
      var totalDataCount = await jobscope.countDocuments({ is_deleted: false });
      var allUsers = await jobscope.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      var totalDataCount = await jobscope.countDocuments({
        name: { $regex: search, $options: "i" },
        is_deleted: false,
      });

      var allUsers = await jobscope.aggregate([
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
    logger.accessLog.info("jobscope fetch fail");
    res.send({
      statusCode: 200,
      message: "jobscope fetch successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("jobscope fetch fail");
    res.send({ statusCode: 500, message: "jobscope fetch fail", error: err });
  }
};

exports.readAllJobScope = async (req, res) => {
  try {
    const userData = await jobscope.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("jobscope fetch success");
    res.send({
      statusCode: 200,
      message: "jobscope fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobscope fetch fail");
    res.send({ statusCode: 500, message: "jobscope fetch fail", error: err });
  }
};

exports.readJobScopeById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await jobscope.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("jobscope fetch success");
    res.send({
      statusCode: 200,
      message: "jobscope fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("jobscope fetch fail");
    res.send({ statusCode: 500, message: "jobscope fetch fail", error: err });
  }
};

exports.createJobScope = async (req, res) => {
  try {
    const newJobScope = await jobscope.create(req.body);
    if (newJobScope) {
      await newJobScope.save();
      logger.accessLog.info("jobscope create successfully");
      res.send({
        statusCode: 200,
        message: "The job scope has been created successfully",
        jobscope: newJobScope,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobscope create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateJobScope = async (req, res) => {
  try {
    const { id } = req.params;
    const updateJobScope = await jobscope.findByIdAndUpdate(id, req.body);
    if (updateJobScope) {
      await updateJobScope.save();
      logger.accessLog.info("jobscope update fail");
      res.send({
        statusCode: 200,
        message: "The job scope has been updated successfully",
        jobscope: updateJobScope,
      });
    }
  } catch (err) {
    logger.errorLog.error("jobscope update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteJobScope = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteJobScope = await jobscope.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("jobscope delete fail");
    res.send({
      statusCode: 200,
      message: "The job scope has been deleted successfully",
      jobscope: deleteJobScope,
    });
  } catch (err) {
    logger.errorLog.error("jobscope delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
