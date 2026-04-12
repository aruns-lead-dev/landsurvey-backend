const express = require('express');
const Joi = require('joi');
const { readHolidays, createHoliday, updateHoliday, deleteHoliday } = require('../controller/holiday.controller');

const route = express.Router();

const validation = Joi.object({
  date: Joi.date().required().label('Date'),
  description: Joi.string().trim().required().label('Description'),
});

const holidayValidation = (req, res, next) => {
  const { error } = validation.validate({ date: req.body.date, description: req.body.description }, {
    errors: { label: 'key', wrap: { label: false } },
  });
  if (error) return res.json({ statusCode: 403, message: error.details[0].message, success: false });
  next();
};

route.get('/', readHolidays);
route.post('/create', holidayValidation, createHoliday);
route.post('/update/:id', holidayValidation, updateHoliday);
route.post('/delete/:id', deleteHoliday);

module.exports = route;
