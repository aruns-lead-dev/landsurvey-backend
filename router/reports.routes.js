const express = require("express");
const Joi = require("joi");
const { reportCreate, reportEmployees } = require("../controller/reports.controller");

const route = express.Router();

const validation = Joi.object({
  DwrReport: {
    employee_id: Joi.required(),
    start_date: Joi.string().required(),
    end_date: Joi.string().required(),
  },
});
const dwrValidation = async (req, res, next) => {
  const payload = {
    DwrReport: {
      employee_id: req.body.employee_id,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
    },
  };

  const { error } = validation.validate(payload, {
    errors: { label: "key", wrap: { label: false } },
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

route.post("/create", dwrValidation, reportCreate);
route.post("/get", reportEmployees);

module.exports = route;
