const express = require("express");
const Joi = require("joi");
const { readRatesheet, readRatesheetById, createRatesheet, updateRatesheet, deleteRatesheet, readAllRatesheet } = require("../controller/ratesheet.controller");
const route = express.Router();


const validation = Joi.object({
  ratesheetDetail: {
    remark: Joi.string().optional().allow(""),
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),
    pdf_name: Joi.string().optional().allow(""),
    billable_line_items: Joi.object().optional().allow(),
    active: Joi.boolean().default(false),

  },
});

const ratesheetValidation = async (req, res, next) => {
  const payload = {
    ratesheetDetail: {
      name: req.body.name,
      remark: req.body.remark,
      billable_line_items: req.body.billable_line_items,
      active: req.body.active,

    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};



route.get("/", readRatesheet)
route.get("/all", readAllRatesheet)
route.get("/one/:id", readRatesheetById)
route.post("/create", ratesheetValidation, createRatesheet)
route.post("/update/:id", ratesheetValidation, updateRatesheet)
route.post("/delete/:id", deleteRatesheet)

module.exports = route