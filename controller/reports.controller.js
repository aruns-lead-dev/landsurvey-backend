const logger = require("../middleware/logger");
const mongoose = require("mongoose");
const dwr = require("../models/dwr");
const { DWR_PIPELINE } = require("../middleware/pipelines");
const { startOfDay, endOfDay } = require("date-fns");

exports.reportCreate = async (req, res) => {
  try {
    var employee_id = req.body.employee_id;
    var start_date = req.body.start_date;
    var end_date = req.body.end_date;
    var page = req.body.page;
    var per_page = req.body.per_page;
    var search = req.body.searchQuery;
    var sortField = req.body.sortField;
    var sortOrder = req.body.sortOrder === "asc" ? 1 : -1;



    const start = startOfDay(new Date(start_date));
    const end = endOfDay(new Date(end_date));

    if (page === undefined || page === null) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    var myMatch = {
      ...(employee_id !== 'allEmployees' && { user_id: mongoose.Types.ObjectId(employee_id) }),
      is_deleted: false,
      task_date: {
        $gte: start,
        $lt: end,
      },
      status: 1,
    };
    const data = page * per_page - per_page;
    if (search == undefined) {

      var reports = await dwr.aggregate([
        ...DWR_PIPELINE,
        { $match: myMatch },
        {
          $addFields: {
            full_name: {
              $concat: ["$user_firstname", " ", "$user_lastname"],
            },
          },
        },
        { $sort: { full_name: sortOrder, createdAt: -1 } },
      ]);
    } else {
      var reports = await dwr.aggregate([
        ...DWR_PIPELINE,
        {
          $match: {
            $and: [
              myMatch,
              {
                $or: [{ dwr_number: { $regex: search } }],
              },
            ],
          },
        },
        {
          $addFields: {
            full_name: {
              $concat: ["$user_firstname", " ", "$user_lastname"],
            },
          },
        },
        { $sort: { full_name: sortOrder, createdAt: -1 } },
      ]);
    }


    logger.accessLog.info("task fetch success");
    res.send({
      statusCode: 200,
      message: "The reports have been fetched successfully.",
      total: 0,
      data: reports,
    });
  } catch (err) {
    logger.errorLog.error("task fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the task",
      error: err,
    });
  }
};

exports.reportEmployees = async (req, res) => {
  try {
    var employee_id = req.body.employee_id;
    var reports = await dwr.aggregate([
      {
        $match: {
          user_id: mongoose.Types.ObjectId(employee_id),
          is_deleted: false,
          status: { $ne: 0 },
        },
      },
      ...DWR_PIPELINE,
    ]);

    logger.accessLog.info("task fetch success");
    res.send({
      statusCode: 200,
      message: "The reports have been fetched successfully.",
      data: reports,
    });
  } catch (err) {
    logger.errorLog.error("task fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the task",
      error: err,
    });
  }
};
