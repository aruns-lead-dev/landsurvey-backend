const express = require('express');
const Joi = require('joi');
const {
  readEmployeeLeaves,
  createEmployeeLeave,
  updateEmployeeLeave,
  deleteEmployeeLeave,
} = require('../controller/employeeLeave.controller');

const route = express.Router();

const validation = Joi.object({
  employee_id: Joi.string().required().label('Employee'),
  date: Joi.date().required().label('Date'),
  job_id: Joi.string().allow('', null).optional().label('Job'),
  task_id: Joi.string().allow('', null).optional().label('Task'),
  time_from: Joi.string().allow('', null).optional().label('Time From'),
  time_to: Joi.string().allow('', null).optional().label('Time To'),
  leave_type: Joi.string().allow('', null).optional().label('Leave Type'),
  description: Joi.string().allow('', null).optional().label('Description'),
});

const employeeLeaveValidation = (req, res, next) => {
  const { error } = validation.validate(req.body, {
    errors: { label: 'key', wrap: { label: false } },
  });
  if (error) return res.json({ statusCode: 403, message: error.details[0].message, success: false });
  next();
};

route.get('/', readEmployeeLeaves);
route.post('/create', employeeLeaveValidation, createEmployeeLeave);
route.post('/update/:id', employeeLeaveValidation, updateEmployeeLeave);
route.post('/delete/:id', deleteEmployeeLeave);

module.exports = route;
