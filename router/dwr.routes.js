const express = require('express');
const Joi = require('joi');
const {
  readDwr,
  readDwrById,
  readAllDwr,
  createDwr,
  updateDwr,
  updateDwrAdmin,
  deleteDwr,
  updateDwrStatus,
  getDwrHoursByTaskId,
  updateDwrStatusBulk,
} = require('../controller/dwr.controller');

const route = express.Router();

const validation = Joi.object({
  DwrDetail: {
    remark: Joi.string().optional().allow(''),
    task_id: Joi.string().required(),
    task_date: Joi.string().required(),
    task_hour: Joi.number().required(),
    estimated_hour: Joi.number().optional().allow(''),
    submit_status: Joi.boolean().default(false),
  },
});
const dwrValidation = async (req, res, next) => {
  const payload = {
    DwrDetail: {
      remark: req.body.remark,
      task_id: req.body.task_id,
      task_date: req.body.task_date,
      task_hour: req.body.task_hour,
      estimated_hour: req.body.estimated_hour,
      submit_status: req.body.submit_status,
    },
  };

  const { error } = validation.validate(payload, {
    errors: { label: 'key', wrap: { label: false } },
  });
  if (error) {
    console.log(error);
    return res.json({
      status: 403,
      message: error.details[0].message,
      success: false,
    });
  } else {
    next();
  }
};

route.get('/', readDwr);
route.get('/one/:id', readDwrById);
route.get('/all', readAllDwr);
route.post('/create', dwrValidation, createDwr);
route.post('/update/:id', dwrValidation, updateDwrAdmin);
route.post('/delete/:id', deleteDwr);
route.get('/task/:task_id', getDwrHoursByTaskId);
route.post('/update_status/:id', updateDwrStatus);
route.post('/update_status_bulk', updateDwrStatusBulk);

module.exports = route;
