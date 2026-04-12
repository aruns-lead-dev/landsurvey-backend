const mongoose = require('mongoose');
const { startOfDay, endOfDay } = require('date-fns');
const logger = require('../middleware/logger');
const {
  SCHEDULING_PIPELINE,
  JOB_PIPELINE,
} = require('../middleware/pipelines');
const job = require('../models/job');
const scheduling = require('../models/scheduling');

exports.readSchedule = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search ? decodeURIComponent(req.query.search) : '';
    var sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    var user_id = req.query.user_id;

    const sortFieldMap = {
      task_number: 'task.number_str',
      job_number: 'job_id.number_str',
      manager: 'project_managers.first_name',
    };
    const sortField = sortFieldMap[req.query.sortField] || 'createdAt';
    var start_date = req.query.startDate ?? null;
    var end_date = req.query.endDate ?? null;

    if (page === undefined) {
      page = '1';
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const skip = page * per_page - per_page;

    var myMatch = { is_deleted: false, status: { $ne: 'completed' } };

    if (
      user_id &&
      user_id !== 'All_Manager' &&
      mongoose.Types.ObjectId.isValid(user_id)
    ) {
      myMatch['project_managers.manager'] = mongoose.Types.ObjectId(user_id);
    }

    if (req.query.endDate && req.query.startDate) {
      const start = startOfDay(new Date(start_date));
      const end = endOfDay(new Date(end_date));
      myMatch.planned_date = { $gte: start, $lt: end };
    }

    if (search === '') {
      var totalDataCount = await scheduling.countDocuments(myMatch);
      var allSchedules = await scheduling.aggregate([
        { $match: myMatch },
        ...SCHEDULING_PIPELINE,
        { $sort: { [sortField]: sortOrder } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      const matchWhere = {
        $match: {
          $and: [
            myMatch,
            {
              $or: [
                { 'task.number_str': { $regex: search, $options: 'i' } },
                { 'job_id.number_str': { $regex: search, $options: 'i' } },
                { 'client_id.company_name': { $regex: search, $options: 'i' } },
              ],
            },
          ],
        },
      };

      const totalDataCountResult = await scheduling.aggregate([
        ...SCHEDULING_PIPELINE,
        matchWhere,
        { $count: 'totalDataCount' },
      ]);
      var totalDataCount =
        totalDataCountResult.length > 0
          ? totalDataCountResult[0].totalDataCount
          : 0;

      var allSchedules = await scheduling.aggregate([
        ...SCHEDULING_PIPELINE,
        matchWhere,
        { $sort: { [sortField]: sortOrder } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(per_page) },
      ]);
    }

    logger.accessLog.info('schedule fetch success');
    res.send({
      statusCode: 200,
      message: 'Schedule Fetched Successfully',
      total: totalDataCount,
      data: allSchedules,
    });
  } catch (err) {
    logger.errorLog.error('schedule fetch fail');
    res.send({ statusCode: 500, message: 'Schedule Fetch Fail', error: err });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { task_id, job_id, task_scope_id, cost_item, estimated_hours } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(task_id)) {
      return res.send({ statusCode: 400, message: 'Invalid task_id' });
    }

    const taskObjectId = mongoose.Types.ObjectId(task_id);

    // Find an existing scheduling record for the same job to reuse
    // project_managers and select_client_id already stored in correct format
    const existingSchedule = await scheduling.findOne({
      job_id,
      is_deleted: false,
    });

    const select_client_id = existingSchedule?.select_client_id ?? null;
    const project_managers = existingSchedule?.project_managers ?? [];

    const newSchedule = await scheduling.create({
      task_id: taskObjectId,
      job_id,
      select_client_id,
      project_managers,
      task_scope_id,
      cost_item: Array.isArray(cost_item) ? cost_item : [cost_item],
      ...(estimated_hours != null && {
        estimated_hours: parseFloat(estimated_hours),
      }),
    });

    logger.accessLog.info('schedule create success');
    return res.send({
      statusCode: 200,
      message: 'Schedule created successfully',
      data: newSchedule,
    });
  } catch (err) {
    logger.errorLog.error('schedule create fail');
    return res.send({
      statusCode: 500,
      message: 'Oops! Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.readAllSchedule = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = req.query.month !== undefined ? parseInt(req.query.month) : now.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const data = await scheduling.aggregate([
      { $match: { is_deleted: false, planned_date: { $gte: startDate, $lt: endDate } } },
      ...SCHEDULING_PIPELINE,
      { $sort: { createdAt: -1 } },
    ]);

    logger.accessLog.info('schedule fetch success');
    res.send({
      statusCode: 200,
      message: 'Schedule Fetched Successfully',
      data,
    });
  } catch (err) {
    logger.errorLog.error('schedule fetch fail');
    res.send({ statusCode: 500, message: 'Schedule Fetch Fail', error: err });
  }
};

exports.findSchedule = async (req, res) => {
  try {
    const { job_id, task_id, task_scope_id } = req.query;

    if (!job_id || !task_id || !task_scope_id) {
      return res.send({
        statusCode: 400,
        message: 'job_id, task_id and task_scope_id are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(task_id)) {
      return res.send({ statusCode: 400, message: 'Invalid task_id' });
    }

    const match = {
      job_id,
      task_id: mongoose.Types.ObjectId(task_id),
      task_scope_id,
      is_deleted: false,
    };

    const results = await scheduling.aggregate([
      { $match: match },
      ...SCHEDULING_PIPELINE,
      { $limit: 1 },
    ]);

    if (!results.length) {
      return res.send({
        statusCode: 404,
        message: 'No matching schedule found for the selected criteria',
      });
    }

    logger.accessLog.info('schedule find success');
    res.send({ statusCode: 200, message: 'Schedule found', data: results[0] });
  } catch (err) {
    logger.errorLog.error('schedule find fail');
    res.send({ statusCode: 500, message: 'Schedule find fail', error: err });
  }
};

exports.readScheduledJobs = async (req, res) => {
  try {
    // Get distinct job_id values (number_str strings) from schedulings
    const jobIds = await scheduling.distinct('job_id', { is_deleted: false });

    // Fetch full job details for those job_ids via JOB_PIPELINE
    const jobs = await job.aggregate([
      { $match: { number_str: { $in: jobIds }, is_deleted: false } },
      ...JOB_PIPELINE,
      { $sort: { job_number: 1 } },
    ]);

    logger.accessLog.info('scheduled jobs fetch success');
    res.send({
      statusCode: 200,
      message: 'Scheduled jobs fetched successfully',
      data: jobs,
    });
  } catch (err) {
    logger.errorLog.error('scheduled jobs fetch fail');
    res.send({
      statusCode: 500,
      message: 'Scheduled jobs fetch fail',
      error: err,
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      group_number,
      sequence_number,
      planned_date,
      document_link,
      assigned_members,
      task_scope_id,
      cost_item,
      estimated_hours,
    } = req.body;

    let members = [];

    assigned_members.forEach((id) =>
      members.push({ employee: mongoose.Types.ObjectId(id) }),
    );
    const updateScheduling = await scheduling.findByIdAndUpdate(
      id,
      {
        group_number,
        sequence_number,
        planned_date,
        document_link,
        assigned_members: members,
        task_scope_id,
        cost_item: [cost_item],
        estimated_hours,
      },
      { new: true },
    );
    if (!updateScheduling) {
      return res.send({
        statusCode: 404,
        message: 'Schedule not found',
        success: false,
      });
    }
    logger.accessLog.info('Schedule update success');
    res.send({
      statusCode: 200,
      message: 'The schedule has been updated successfully',
      schedule: updateScheduling,
    });
  } catch (err) {
    logger.errorLog.error('schedule update fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};
