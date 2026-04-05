const express = require('express');
const Joi = require('joi');
const { readHolydays, createHolyday, updateHolyday, deleteHolyday } = require('../controller/holyday.controller');

const route = express.Router();

const validation = Joi.object({
  date: Joi.date().required().label('Date'),
  description: Joi.string().trim().required().label('Description'),
});

const holydayValidation = (req, res, next) => {
  const { error } = validation.validate({ date: req.body.date, description: req.body.description }, {
    errors: { label: 'key', wrap: { label: false } },
  });
  if (error) return res.json({ statusCode: 403, message: error.details[0].message, success: false });
  next();
};

route.get('/', readHolydays);
route.post('/create', holydayValidation, createHolyday);
route.post('/update/:id', holydayValidation, updateHolyday);
route.post('/delete/:id', deleteHolyday);

module.exports = route;
