const express = require('express');
const Joi = require('joi');
const {
  readAllSchedule,
  readSchedule,
  createSchedule,
  updateSchedule,
  readScheduledJobs,
  findSchedule,
} = require('../controller/schedule.controller');
const route = express.Router();

const validation = Joi.object({
  task_id: Joi.string().hex().length(24).optional().label('Task ID'),
  job_id: Joi.string().optional().allow(null, '').label('Job ID'),
  project_managers: Joi.array()
    .items(Joi.object())
    .optional()
    .label('Project Managers'),
  task_scope_id: Joi.string().optional().allow(null, '').label('Task Scope ID'),
  cost_item: Joi.string().optional().allow(null, '').label('Cost Item'),
  group_number: Joi.number().optional().allow(null).label('Group Number'),
  sequence_number: Joi.number().optional().allow(null).label('Sequence Number'),
  planned_date: Joi.date().optional().allow(null).label('Planned Date'),
  assigned_members: Joi.array()
    .items(Joi.string().hex().label('Assigned Members'))
    .optional(),
  estimated_hours: Joi.number().optional().allow(null).label('Estimated Hours'),
  comments: Joi.array()
    .items(Joi.object({ comment_id: Joi.string().optional().label('comment') }))
    .optional()
    .label('Comments'),
  document_link: Joi.string().optional().allow('').label('Document Link'),
});

const scheduleValidation = (req, res, next) => {
  const { error } = validation.validate(req.body, {
    errors: { label: 'key', wrap: { label: false } },
  });

  if (error) {
    return res.json({
      statusCode: 403,
      message: error.details[0].message,
      success: false,
    });
  }

  next();
};

route.get('/', readSchedule);
route.get('/all', readAllSchedule);
route.get('/jobs', readScheduledJobs);
route.get('/find', findSchedule);
route.post('/create', scheduleValidation, createSchedule);
route.post('/update/:id', scheduleValidation, updateSchedule);

module.exports = route;
