const { mongoose } = require("mongoose");
const mongooseLib = require("mongoose");
const logger = require("../middleware/logger");
const Jimp = require("jimp");
const {
  TASK_PIPELINE,
  CLIENT_PIPELINE,
  JOB_PIPELINE,
  QUOTE_PIPELINE,
  QUOTE_TASK_PIPELINE,
  DWR_PIPELINE,
} = require("../middleware/pipelines");
const task = require("../models/task");
const client = require("../models/client");
const job = require("../models/job");
const quote = require("../models/quote");
const ratesheet = require("../models/ratesheet");
const user = require("../models/user");
const jobscope = require("../models/jobscope");
const jobcategory = require("../models/jobcategory");
const jobstatus = require("../models/jobstatus");
const costItem = require("../models/costiteam");
const office = require("../models/office");
const dwr = require("../models/dwr");
const scheduling = require("../models/scheduling");

const { default: axios } = require("axios");
const { startOfDay, endOfDay } = require("date-fns");

exports.TaskInitalData = async (req, res) => {
  try {
    const clientData = await client.aggregate([
      {
        $match: {
          is_deleted: false,
        },
      },
      { $sort: { company_name: 1 } },
      ...CLIENT_PIPELINE,
    ]);
    const quoteData = await quote.aggregate([
      {
        $match: {
          is_deleted: false,
        },
      },
      { $sort: { createdAt: -1 } },
      ...QUOTE_PIPELINE,
    ]);
    const ratesheetData = await ratesheet.find({ is_deleted: false });
    const managerData = await user.find({
      is_deleted: false,
      role: "manager",
    });
    const scopeData = await jobscope
      .find({ is_deleted: false })
      .sort({ name: 1 });

    const officeData = await office.find({ is_deleted: false });
    const categoryData = await jobcategory.find({ is_deleted: false });
    const statusData = await jobstatus.find({ is_deleted: false });
    const labourCostItemData = await costItem.find({
      is_deleted: false,
      category: "Labour Cost Items",
    });
    const materialCostItemData = await costItem.find({
      is_deleted: false,
      category: "Equipment and Materials Item",
    });
    const fixedCostItemData = await costItem.find({
      is_deleted: false,
      category: "Fixed Price Item",
    });
    logger.accessLog.info("task inital data fetch success");
    res.send({
      statusCode: 200,
      message: "The task initial data has been fetched successfully",
      data: {
        client: clientData,
        job: [],
        quote: quoteData,
        ratesheet: ratesheetData,
        manager: managerData,
        staff: [],
        office: officeData,
        scope: scopeData,
        category: categoryData,
        status: statusData,
        labourCostItem: labourCostItemData,
        materialCostItem: materialCostItemData,
        fixedCostItem: fixedCostItemData,
      },
    });
  } catch (err) {
    logger.errorLog.error("task inital data fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the task initial data",
      error: err,
    });
  }
};

exports.readTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const taskquotedata = await task.findOne({ _id: id });
    const taskDatawithQuote = await task.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
          quote_id: taskquotedata.quote_id,
        },
      },
      ...TASK_PIPELINE,
      ...QUOTE_TASK_PIPELINE,
    ]);
    const taskDatawithoutQuote = await task.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      ...TASK_PIPELINE,
    ]);
    const taskData = [...taskDatawithQuote, ...taskDatawithoutQuote];
    logger.accessLog.info("task fetch success");
    res.send({
      statusCode: 200,
      message: "The task has been fetched successfully",
      data: taskData,
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

exports.readTask = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = decodeURIComponent(req.query.search);
    var sortField = req.query.sortField;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    var user_id = req.query.user_id;
    var start_date = req.query.startDate ?? null;
    var end_date = req.query.endDate ?? null;
    let sortType = req.query.is_complete === "1" ? "updatedAt" : "createdAt";

    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;

    var myMatch = {
      is_deleted: false,
    };
    var myMatchCount = {
      is_deleted: false,
    };
    if (user_id && user_id !== "All_Manager") {
      myMatch.project_manager = mongoose.Types.ObjectId(user_id);
      myMatchCount.project_manager = mongoose.Types.ObjectId(user_id);
    }
    if (req?.query?.is_complete) {
      const isComplete = parseInt(req.query.is_complete);
      myMatch.is_completed = isComplete;
      myMatchCount.is_completed = isComplete;
    }

    if (req.query.endDate && req.query.startDate) {
      const start = startOfDay(new Date(start_date));
      const end = endOfDay(new Date(end_date));
      if (req.query.is_complete === "1") {
        myMatch.completed_task_date = {
          $gte: start,
          $lt: end,
        };
      } else {
        myMatch.createdAt = {
          $gte: start,
          $lt: end,
        };
      }
    }

    if (search === "") {
      var totalDataCount = await task.countDocuments(myMatch);
      if (sortField === "job_number") {
        var allTasks = await task.aggregate([
          { $match: myMatch },
          ...TASK_PIPELINE,
          { $sort: { "job_id.number": sortOrder, [sortType]: -1 } },
          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      } else if (sortField === "manager") {
        var allTasks = await task.aggregate([
          ...TASK_PIPELINE,
          { $match: myMatch },
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
          { $sort: { full_name: sortOrder, [sortType]: -1 } }, // Sort by user_firstname
          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      } else {
        var allTasks = await task.aggregate([
          ...TASK_PIPELINE,
          { $match: myMatch },
          { $sort: { [sortType]: sortOrder } },

          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      }
    } else {
      const matchWhere = {
        $match: {
          $and: [
            myMatch,
            {
              $or: [
                { number_str: { $regex: search, $options: "i" } },
                { "job_id.number_str": { $regex: search, $options: "i" } },
                {
                  "client_id.company_name": {
                    $regex: search,
                    $options: "i",
                  },
                },
                { "invoice_id.number_str": { $regex: search, $options: "i" } },
                { "invoice_id.doc_number": { $regex: search, $options: "i" } },
                { "task_scope_id.name": { $regex: search, $options: "i" } },
              ],
            },
          ],
        },
      };
      const totalDataCountPipeline = [
        ...TASK_PIPELINE,
        matchWhere,
        {
          $count: "totalDataCount",
        },
      ];

      const totalDataCountResult = await task.aggregate(totalDataCountPipeline);
      var totalDataCount =
        totalDataCountResult.length > 0
          ? totalDataCountResult[0].totalDataCount
          : 0;
      if (sortField === "job_number") {
        var allTasks = await task.aggregate([
          ...TASK_PIPELINE,
          matchWhere,
          { $sort: { "job_id.number": sortOrder, [sortType]: -1 } },
          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      } else if (sortField === "manager") {
        var allTasks = await task.aggregate([
          ...TASK_PIPELINE,
          matchWhere,
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
          { $sort: { full_name: sortOrder, [sortType]: -1 } }, // Sort by user_firstname
          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      } else {
        var allTasks = await task.aggregate([
          ...TASK_PIPELINE,
          matchWhere,
          { $sort: { [sortType]: sortOrder } },
          { $skip: parseInt(data) },
          { $limit: parseInt(per_page) },
        ]);
      }
    }

    logger.accessLog.info("task fetch success");
    res.send({
      statusCode: 200,
      message: "The task has been fetched successfully",
      total: totalDataCount,
      data: allTasks,
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

exports.totalEstimatedBillableCost = async (req, res) => {
  var user_id = req.query.user_id;
  var myMatch = {
    is_deleted: false,
    is_completed: 0,
  };
  if (req?.query?.is_complete) {
    myMatch.is_completed = 1;
    if (req.query.endDate && req.query.startDate) {
      const start = startOfDay(new Date(req.query.startDate));
      const end = endOfDay(new Date(req.query.endDate));
      myMatch.completed_task_date = {
        $gte: start,
        $lt: end,
      };
    }
  }
  if (user_id && user_id !== "All_Manager") {
    myMatch.project_manager = mongoose.Types.ObjectId(user_id);
  }

  try {
    var totalDataCount = await task.countDocuments({
      $match: { is_deleted: false },
    });

    var featchAllTask = await task.aggregate([
      ...TASK_PIPELINE,
      { $match: myMatch },
      { $sort: { createdAt: -1 } },
    ]);

    const calculateBillableCosts = (item) => {
      const ESTIMATE = item?.ratesheet_id?.billable_line_items;
      const DWRS = item.dwrs;

      return DWRS.filter((dwr_item) => dwr_item.status === 1).flatMap(
        (dwrsEntry) => {
          return dwrsEntry.billing_line_items.labourCosts
            .map((dwrsItem) => {
              const estimateMatch = ESTIMATE.labourItem.find(
                (estimateItem) => estimateItem.costItem === dwrsItem.costitem
              );

              if (estimateMatch) {
                const unitCost = parseFloat(estimateMatch.unitCost);
                const taskHours = parseFloat(dwrsItem.hours);
                return {
                  task_id: dwrsEntry.task_id,
                  costitem: dwrsItem.costitem,
                  unitCost: unitCost,
                  taskHours: taskHours,
                  totalCost: unitCost * taskHours,
                };
              }
              return null;
            })
            .filter(Boolean);
        }
      );
    };

    let totalBillableCost = 0;
    let totalEstimatedCost = 0;
    featchAllTask.forEach((item) => {
      const totalOfDwrCost = calculateBillableCosts(item);
      const totalBilebleSum = totalOfDwrCost.reduce(
        (acc, curr) => acc + curr.totalCost,
        0
      );

      totalBillableCost = totalBillableCost + parseFloat(totalBilebleSum);
      if (req?.query?.is_complete) {
        if (item?.is_invoice_generated) {
          totalEstimatedCost =
            totalEstimatedCost +
            parseFloat(
              item?.invoice_id?.sub_total ? item?.invoice_id?.sub_total : 0
            );
        }
      } else {
        totalEstimatedCost =
          totalEstimatedCost +
          parseFloat(item?.total_cost_hour ? item.total_cost_hour : 0);
      }
    });
    res.send({
      statusCode: 200,
      message: "Total Cost has been fetched successfully",
      totalBillableCost: totalBillableCost,
      totalEstimatedCost: totalEstimatedCost,
      totalDataCount: totalDataCount,
    });
  } catch (error) {
    logger.errorLog.error("task fetch fail");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the total cost",
      error: error,
    });
  }
};

exports.readAllTask = async (req, res) => {
  try {
    const userData = await task.aggregate([
      {
        $match: {
          is_deleted: false, // Ensures only non-deleted tasks are considered
        },
      },
    ]);
    logger.accessLog.info("task fetch success");
    res.send({
      statusCode: 200,
      message: "The task has been fetched successfully",
      data: userData,
      updatedwrData: updatedwrData,
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

exports.createTask = async (req, res) => {
  const session = await mongooseLib.startSession();
  session.startTransaction();
  try {
    const {
      selectClient,
      selectClient_id,
      selectRatesheet,
      selectRatesheet_id,
      description,
      clientAddress,
      selectQuote,
      companyName,
      selectJob,
      labourItem,
      materialItem,
      fixItem,
      glCode,
      additionalLabourItem,
      additionalEquipmentItem,
      estimateHour,
      ProjectManager,
      Office,
      Office_id,
      clientLocation,
      clientLocation_id,
      TaskCategory,
      TaskCategory_id,
      TaskScope,
      TaskScope_id,
      Status,
      Status_id,
      name,
      remark,
      active,
      attachments,
      total_cost_hour,
    } = req.body;
    if (req.body.attachments && req.body.attachments !== "") {
      const data = attachments?.slice(22);
      const buffer = Buffer.from(data, "base64");
      req.body.attachments = `${Date.now()}_task.png`;
      Jimp.read(buffer, (error, res) => {
        if (error) {
          logger.errorLog.error(
            `error at catch from image generation : ${error}`
          );
        } else {
          res
            .quality(5)
            .write(
              __dirname + `/../public/task/attachments/${req.body.attachments}`
            );
        }
      });
    } else {
      req.body.attachments = "";
    }

    const [newTask] = await task.create(
      [
        {
          attachments: req.body.attachments,
          client_id: selectClient,
          select_client_id: selectClient_id,
          ratesheet_id: selectRatesheet_id,
          quote_id: selectQuote,
          company_name: companyName,
          job_id: selectJob,
          project_manager: ProjectManager,
          name: name,
          description: description,
          client_location_id: clientLocation,
          select_client_location_id: clientLocation_id,
          client_address: clientAddress,
          office_id: Office,
          select_office_id: Office_id,
          task_category_id: TaskCategory,
          select_task_category_id: TaskCategory_id,
          task_scope_id: TaskScope,
          select_task_scope_id: TaskScope_id,
          gl_code_prefix: glCode,
          estimate_hour: estimateHour,
          total_cost_hour: total_cost_hour,
          billing_line_items: {
            labour_item: {
              labour_cost_items: labourItem,
              additional_fields: additionalLabourItem,
            },
            equipment_item: {
              equipment_cost_items: materialItem,
              additional_fields: additionalEquipmentItem,
            },
            fixed_item: fixItem,
          },
          status: Status,
          status_id: Status_id,
          remark: remark,
          active: active,
        },
      ],
      { session }
    );
    if (newTask) {
      if (req.body.selectQuote_id || req.body.selectQuote_id !== "") {
        await quote.findByIdAndUpdate(
          req.body.selectQuote_id,
          { $set: { is_converted: 1 } },
          { session }
        );
      }
      await task.findByIdAndUpdate(
        newTask._id,
        { $set: { number_str: newTask.number.toString().padStart(6, "0") } },
        { session }
      );

      const schedulingDocs =
        labourItem && labourItem.length > 0
          ? labourItem.map((item) => ({
              task_id: newTask._id,
              job_id: selectJob,
              select_client_id: selectClient_id,
              project_managers: ProjectManager
                ? [{ manager: ProjectManager }]
                : [],
              cost_item: item.costItem ? [item.costItem] : [],
            }))
          : [
              {
                task_id: newTask._id,
                job_id: selectJob,
                select_client_id: selectClient_id,
                project_managers: ProjectManager
                  ? [{ manager: ProjectManager }]
                  : [],
              },
            ];

      await scheduling.create(schedulingDocs, { session });

      await session.commitTransaction();
      session.endSession();

      logger.accessLog.info("task create success");
      res.send({
        statusCode: 200,
        message: "The task has been created successfully",
        task: newTask,
      });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.errorLog.error("task create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      selectClient,
      selectClient_id,
      selectRatesheet,
      selectRatesheet_id,
      description,
      clientAddress,
      selectQuote,
      companyName,
      selectJob,
      labourItem,
      materialItem,
      fixItem,
      glCode,
      additionalLabourItem,
      additionalEquipmentItem,
      estimateHour,
      total_cost_hour,
      ProjectManager,
      Office,
      Office_id,
      clientLocation,
      clientLocation_id,
      TaskCategory,
      TaskCategory_id,
      TaskScope,
      TaskScope_id,
      Status,
      Status_id,
      name,
      remark,
      active,
      attachments,
    } = req.body;
    if (attachments !== "") {
      if (attachments.includes("task")) {
        req.body.attachments = req.body.attachments;
      } else {
        const data = attachments?.slice(22);
        const buffer = Buffer.from(data, "base64");
        req.body.attachments = `${Date.now()}_task.png`;
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
                `/../public/task/attachments/${req.body.attachments}`
              );
          }
        });
      }
    } else {
      req.body.attachments = "";
    }

    const updateTaskData = await task.findByIdAndUpdate(id, {
      attachments: req.body.attachments,
      client_id: selectClient,
      select_client_id: selectClient_id,
      ratesheet_id: selectRatesheet_id,
      quote_id: selectQuote,
      company_name: companyName,
      job_id: selectJob,
      project_manager: ProjectManager,
      name: name,
      description: description,
      client_location_id: clientLocation,
      select_client_location_id: clientLocation_id,
      client_address: clientAddress,
      office_id: Office,
      select_office_id: Office_id,
      task_category_id: TaskCategory,
      select_task_category_id: TaskCategory_id,
      task_scope_id: TaskScope,
      select_task_scope_id: TaskScope_id,
      gl_code_prefix: glCode,
      estimate_hour: estimateHour,
      total_cost_hour: total_cost_hour,
      billing_line_items: {
        labour_item: {
          labour_cost_items: labourItem,
          additional_fields: additionalLabourItem,
        },
        equipment_item: {
          equipment_cost_items: materialItem,
          additional_fields: additionalEquipmentItem,
        },
        fixed_item: fixItem,
      },
      status: Status,
      status_id: Status_id,
      remark: remark,
      active: active,
    });
    if (updateTaskData) {
      await updateTaskData.save();

      const newCostItems = (labourItem || [])
        .map((item) => item.costItem)
        .filter(Boolean);

      const existingSchedulings = await scheduling.find({
        task_id: mongooseLib.Types.ObjectId(id),
        is_deleted: false,
      });

      const existingCostItems = existingSchedulings.map(
        (doc) => (doc.cost_item && doc.cost_item[0]) || null
      );

      const toDelete = existingSchedulings.filter(
        (doc) =>
          !newCostItems.includes((doc.cost_item && doc.cost_item[0]) || null)
      );

      const toAdd = newCostItems.filter(
        (costItem) => !existingCostItems.includes(costItem)
      );

      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((doc) => doc._id);
        await scheduling.updateMany(
          { _id: { $in: deleteIds } },
          { $set: { is_deleted: true } }
        );
      }

      if (toAdd.length > 0) {
        const newSchedulingDocs = toAdd.map((costItem) => ({
          task_id: updateTaskData._id,
          job_id: selectJob,
          select_client_id: selectClient_id,
          project_managers: ProjectManager
            ? [{ manager: ProjectManager }]
            : [],
          cost_item: [costItem],
        }));
        await scheduling.create(newSchedulingDocs);
      }

      logger.accessLog.info("task update success");
      res.send({
        statusCode: 200,
        message: "The task has been updated successfully",
        task: updateTaskData,
      });
    }
  } catch (err) {
    logger.errorLog.error("task update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, task_complete_date } = req.body;

    let updateStatus = 0;
    if (status === "complete") {
      updateStatus = 1;
    } else {
      updateStatus = 2;
    }

    const updatejobData = await task.findByIdAndUpdate(id, {
      is_completed: updateStatus,
      completed_task_date: task_complete_date,
    });
    if (updatejobData) {
      await updatejobData.save();
      logger.accessLog.info("Task status updated Successfully");
      res.send({
        statusCode: 200,
        message: "The task has been updated successfully",
      });
    }
  } catch (err) {
    logger.errorLog.error("Task status update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const DWRRelatedDataExists = await dwr.findOne({
      task_id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    }); // Replace 'job_id' with the actual field name

    if (DWRRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message: "Cannot delete. Task is referenced in Dwr collection.",
      });
    }
    const taskDetails = await task.findById(id);
    if (taskDetails.quote_id) {
      const quoteDataExists = await quote.findOne({
        number_str: taskDetails.quote_id,
        is_deleted: false,
      });
      const ConverQuoteData = await quote.findByIdAndUpdate(
        quoteDataExists._id,
        {
          $set: { is_converted: 0 },
        }
      );
    }
    const deleteTaskData = await task.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });

    await scheduling.updateMany(
      { task_id: mongooseLib.Types.ObjectId(id), is_deleted: false },
      { $set: { is_deleted: true } }
    );

    logger.accessLog.info("task delete success");
    res.send({
      statusCode: 200,
      message: "The task has been deleted successfully",
      task: deleteTaskData,
    });
  } catch (err) {
    logger.errorLog.error("task delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.TaskSearch = async (req, res) => {
  try {
    var search = req.query.search;
    var job_id = req.query.job_id;
    var myMatch = {
      is_deleted: false,
      is_completed: 0,
      job_id: job_id,
    };

    var allTasks = await task.aggregate([
      {
        $match: {
          $and: [myMatch, { $or: [{ number_str: { $regex: search } }] }],
        },
      },
      ...TASK_PIPELINE,
    ]);

    res.send({
      statusCode: 200,
      message: "The task has been fetched successfully",
      data: allTasks,
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

exports.updateTaskEstimatedHours = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimateHour, dwr_id } = req.body;
    if (estimateHour) {
      let updateTask = false;

      const dwrData = await dwr.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(dwr_id),
            is_deleted: false,
          },
        },
        ...DWR_PIPELINE,
      ]);

      const DWRDetails = dwrData[0];

      const taskData = await task.aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(id),
            is_deleted: false,
          },
        },
        ...TASK_PIPELINE,
      ]);

      const TaskDetails = taskData[0];

      const UpdatedLabourCost =
        TaskDetails?.billing_line_items.labour_item.labour_cost_items.map(
          (item) => {
            if (
              item.costItem ===
              DWRDetails.billing_line_items.labourCosts[0].costitem
            ) {
              updateTask = true;
              item.estimated_hour = estimateHour;
            }
            return item;
          }
        );

      if (updateTask) {
        const getlbCost = UpdatedLabourCost?.map(
          (i) => parseFloat(i.estimated_hour) * parseFloat(i.unitCost)
        );
        const getTotallbCost = getlbCost?.reduce(
          (partialSum, a) => partialSum + a,
          0
        );
        const getTotalCost = parseFloat(getTotallbCost);

        const getlbEst =
          TaskDetails?.billing_line_items?.labour_item?.labour_cost_items?.map(
            (i) => parseFloat(i.estimated_hour)
          );
        const getTotalEstHours = getlbEst?.reduce(
          (partialSum, a) => partialSum + a,
          0
        );
        const getTotalHours = parseFloat(getTotalEstHours);

        // Create a new object with updated labour_cost_items
        const updatedBillingLineItems = {
          ...TaskDetails.billing_line_items, // Spread the existing billing_line_items properties
          labour_item: {
            ...TaskDetails.billing_line_items.labour_item, // Spread the labour_item properties
            labour_cost_items: UpdatedLabourCost, // Update only labour_cost_items
          },
        };

        const updateTaskData = await task.findByIdAndUpdate(id, {
          total_cost_hour: getTotalCost,
          estimate_hour: getTotalHours,
          billing_line_items: updatedBillingLineItems,
        });

        if (updateTaskData) {
          await updateTaskData.save();
          logger.accessLog.info("task update success");
          return res.send({
            statusCode: 200,
            message: "The task has been updated successfully",
            task: updateTaskData,
          });
        }
      }

      return res.send({
        statusCode: 200,
        message: "The task has been updated successfully",
        task: [],
      });
    }
    return res.send({
      statusCode: 200,
      message: "The task has been updated successfully",
      task: [],
    });
  } catch (err) {
    logger.errorLog.error("task update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
