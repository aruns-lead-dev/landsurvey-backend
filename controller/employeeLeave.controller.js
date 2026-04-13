const logger = require('../middleware/logger');
const employeeLeave = require('../models/employeeLeave');

exports.readEmployeeLeaves = async (req, res) => {
  try {
    const { year, month } = req.query;
    const filter = { is_deleted: false };

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10) - 1; // convert to 0-indexed
      const startDate = new Date(y, m, 1, 0, 0, 0, 0);
      const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const data = await employeeLeave
      .find(filter)
      .populate('employee_id', 'first_name last_name')
      .populate('job_id', 'number_str')
      .populate('task_id', 'number_str')
      .sort({ date: -1 });
    res.send({ statusCode: 200, message: 'Employee leaves fetched successfully', data });
  } catch (err) {
    logger.errorLog.error('employee leave fetch fail');
    res.send({ statusCode: 500, message: 'Employee Leave Fetch Fail', error: err });
  }
};

exports.createEmployeeLeave = async (req, res) => {
  try {
    const { job_id, task_id, employee_id, date, time_from, time_to, leave_type, description } = req.body;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await employeeLeave.findOne({
      employee_id,
      date: { $gte: startOfDay, $lte: endOfDay },
      is_deleted: false,
    });
    if (existing) {
      return res.send({ statusCode: 409, message: 'A leave entry already exists for this date.' });
    }

    const newLeave = await employeeLeave.create({
      job_id,
      task_id,
      employee_id,
      date,
      time_from,
      time_to,
      leave_type,
      description,
    });
    logger.accessLog.info('employee leave create success');
    res.send({ statusCode: 200, message: 'Employee leave created successfully', data: newLeave });
  } catch (err) {
    logger.errorLog.error('employee leave create fail');
    res.send({ statusCode: 500, message: 'Employee Leave Create Fail', error: err });
  }
};

exports.updateEmployeeLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { job_id, task_id, employee_id, date, time_from, time_to, leave_type, description } = req.body;
    const updated = await employeeLeave.findByIdAndUpdate(
      id,
      { job_id, task_id, employee_id, date, time_from, time_to, leave_type, description },
      { new: true },
    );
    if (!updated) return res.send({ statusCode: 404, message: 'Employee leave not found' });
    logger.accessLog.info('employee leave update success');
    res.send({ statusCode: 200, message: 'Employee leave updated successfully', data: updated });
  } catch (err) {
    logger.errorLog.error('employee leave update fail');
    res.send({ statusCode: 500, message: 'Employee Leave Update Fail', error: err });
  }
};

exports.deleteEmployeeLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await employeeLeave.findByIdAndUpdate(id, { $set: { is_deleted: true } });
    if (!deleted) return res.send({ statusCode: 404, message: 'Employee leave not found' });
    logger.accessLog.info('employee leave delete success');
    res.send({ statusCode: 200, message: 'Employee leave deleted successfully' });
  } catch (err) {
    logger.errorLog.error('employee leave delete fail');
    res.send({ statusCode: 500, message: 'Employee Leave Delete Fail', error: err });
  }
};
