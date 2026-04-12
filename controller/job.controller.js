const { default: axios } = require("axios");
const { default: mongoose } = require("mongoose");
const logger = require("../middleware/logger");
const { JOB_PIPELINE } = require("../middleware/pipelines");
const job = require("../models/job");
const quote = require("../models/quote");
const task = require("../models/task");

exports.readJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const jobData = await job.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      { $sort: { createdAt: -1 } },
      ...JOB_PIPELINE,
    ]);
    logger.accessLog.info("job fetch success");
    res.send({
      statusCode: 200,
      message: "The job has been fetched successfully",
      data: jobData,
    });
  } catch (err) {
    logger.errorLog.error("job fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the job",
      error: err,
    });
  }
};

exports.JobSearch = async (req, res) => {
  try {
    var search = req.query.search;
    var myMatch = {
      is_deleted: false,
    };
    var allTasks = []
    if (search && search !== "00") {
      allTasks = await job.aggregate([
        {
          $match: {
            $and: [myMatch, { $or: [{ number_str: { $regex: search } }] }],
          },
        },
        ...JOB_PIPELINE,
      ]);
    } else {
      allTasks = await job.aggregate([
        {
          $match: myMatch,
        },
        ...JOB_PIPELINE,
        {
          $sort: { _id: -1 }, // Sort by `_id` in descending order
        },
        {
          $limit: 100, // Limit to the last 200 records
        },
      ])
    }

    res.send({
      statusCode: 200,
      message: "The job has been fetched successfully",
      data: allTasks,
    });
  } catch (err) {
    logger.errorLog.error("job fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the job",
      error: err,
    });
  }
};

exports.readJob = async (req, res) => {
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
      var totalDataCount = await job.countDocuments({ is_deleted: false });
      var allJobs = await job.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...JOB_PIPELINE,
      ]);
    } else {
      var totalDataCount = await job.countDocuments({
        $and: [
          { is_deleted: false },
          {
            $or: [
              { number_str: { $regex: search, $options: "i" } }, // Case-insensitive search for number_str
              { "locations.name": { $regex: search, $options: "i" } }, // Search in locations.name
              {
                "locations.munciple_address": { $regex: search, $options: "i" },
              }, // Search in locations.munciple_address
              { "locations.state": { $regex: search, $options: "i" } }, // Search in locations.state
              { "locations.postal_code": { $regex: search, $options: "i" } }, // Search in locations.postal_code
              { "locations.city": { $regex: search, $options: "i" } }, // Sea
            ],
          },
        ],
      });
      var allJobs = await job.aggregate([
        {
          $match: {
            $and: [
              { is_deleted: false },
              {
                $or: [
                  { number_str: { $regex: search, $options: "i" } }, // Case-insensitive search for number_str
                  { "locations.name": { $regex: search, $options: "i" } }, // Search in locations.name
                  {
                    "locations.munciple_address": {
                      $regex: search,
                      $options: "i",
                    },
                  }, // Search in locations.munciple_address
                  { "locations.state": { $regex: search, $options: "i" } }, // Search in locations.state
                  {
                    "locations.postal_code": { $regex: search, $options: "i" },
                  }, // Search in locations.postal_code
                  { "locations.city": { $regex: search, $options: "i" } }, // Sea
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...JOB_PIPELINE,
      ]);
    }
    logger.accessLog.info("job fetch success");
    res.send({
      statusCode: 200,
      message: "The job has been fetched successfully",
      total: totalDataCount,
      data: allJobs,
    });
  } catch (err) {
    logger.errorLog.error("job fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the job",
      error: err,
    });
  }
};

exports.managerReadJob = async (req, res) => {
  try {
    const { id } = req.params;
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === "") {
      var totalDataCount = await job.countDocuments({ is_deleted: false });
      var allJobs = await job.aggregate([
        { $match: { is_deleted: false } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...JOB_PIPELINE,
      ]);
    } else {
      var totalDataCount = await job.countDocuments({
        $and: [
          { is_deleted: false },
          { $or: [{ number_str: { $regex: search } }] },
        ],
      });
      var allJobs = await job.aggregate([
        {
          $match: {
            $and: [
              { is_deleted: false },
              { $or: [{ number_str: { $regex: search } }] },
            ],
          },
        },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...JOB_PIPELINE,
      ]);
    }

    logger.accessLog.info("job fetch success");
    res.send({
      statusCode: 200,
      message: "manager job data fetch successfully",
      total: totalDataCount,
      data: allJobs,
    });
  } catch (err) {
    logger.errorLog.error("job fetch fail");
    res.send({
      statusCode: 500,
      message: "manager job data fetch fail",
      error: err,
    });
  }
};

exports.readAllJob = async (req, res) => {
  try {
    const userData = await job.aggregate([
      {
        $match: { is_deleted: false },
      },
      { $sort: { createdAt: -1 } },
      ...JOB_PIPELINE,
    ]);
    logger.accessLog.info("job fetch success");
    res.send({
      statusCode: 200,
      message: "The job has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("job fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the job",
      error: err,
    });
  }
};

exports.createJob = async (req, res) => {
  try {
    const {
      taxItem,
      feesItem,
      invoiceLineItemType,
      taxesName,
      client_project,
      PO,
      po_amount,
      subcontract,
      active,
      orderDate,
      dueDate,
      Status,
      Status_id,
      remark,
      selectClient_id,
      locations,
    } = req.body;
    const newJob = await job.create({
      client_id: selectClient_id,
      taxes: taxItem,
      fees: feesItem,
      client_project: client_project,
      po: PO,
      po_amount: po_amount,
      sub_contract: subcontract,
      order_date: orderDate,
      due_date: dueDate,
      invoice_line_item_type: invoiceLineItemType,
      taxes_name: taxesName,
      status: Status,
      status_id: Status_id,
      active: active,
      remark: remark,
      locations: [
        {
          name: locations[0]?.locationName,
          munciple_address: locations[0]?.muncipleAddress,
          state: locations[0]?.stateprovince,
          state_id: locations[0]?.stateprovince_id,
          postal_code: locations[0]?.postalCode,
          city: locations[0]?.city,
          city_id: locations[0]?.city_id,
        },
      ],
    });
    if (newJob) {
      await newJob.save();
      await job.findByIdAndUpdate(newJob._id, { $set: { number_str: newJob.number.toString().padStart(6, '0') } })
      logger.accessLog.info("The job has been created successfully");
      res.send({
        statusCode: 200,
        message: "The job has been created successfully",
        job: newJob,
      });
    }
  } catch (err) {
    logger.errorLog.error("Failed to create the job");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client,
      projectManagerid,
      taxItem,
      feesItem,
      invoiceLineItemType,
      taxesName,
      client_address,
      client_project,
      PO,
      po_amount,
      subcontract,
      active,
      orderDate,
      dueDate,
      Status,
      Status_id,
      clientLocation,
      remark,
      selectClient_id,
      locations,
    } = req.body;
    const updateJobData = await job.findByIdAndUpdate(id, {
      client_id: selectClient_id,
      taxes: taxItem,
      fees: feesItem,
      client_project: client_project,
      po: PO,
      po_amount: po_amount,
      sub_contract: subcontract,
      order_date: orderDate,
      due_date: dueDate,
      invoice_line_item_type: invoiceLineItemType,
      taxes_name: taxesName,
      status: Status,
      status_id: Status_id,
      active: active,
      remark: remark,
      locations: [
        {
          name: locations[0]?.locationName,
          munciple_address: locations[0]?.muncipleAddress,
          state: locations[0]?.stateprovince,
          state_id: locations[0]?.stateprovince_id,
          postal_code: locations[0]?.postalCode,
          city: locations[0]?.city,
          city_id: locations[0]?.city_id,
        },
      ],
    });
    if (updateJobData) {
      await updateJobData.save();
      logger.accessLog.info("The job has been updated successfully.");
      res.send({
        statusCode: 200,
        message: "The job has been updated successfully",
        job: updateJobData,
      });
    }
  } catch (err) {
    logger.errorLog.error("Failed to update the job.");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const QuoteRelatedDataExists = await quote.findOne({
      job_id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    }); // Replace 'job_id' with the actual field name
    if (QuoteRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message:
          "delete is not possible. The job is referenced in the Quote collection",
      });
    }
    const jobDetails = await job.findOne({
      _id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    });
    const taskRelatedDataExists = await task.findOne({
      job_id: jobDetails.number_str,
      is_deleted: false,
    });

    if (taskRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message:
          "delete is not possible. The job is referenced in the Task collection",
      });
    }

    const deleteJobData = await job.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("Job deleted successfully.");
    res.send({
      statusCode: 200,
      message: "Job deleted successfully",
      job: deleteJobData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to delete the job.");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
