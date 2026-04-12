const express = require("express");
const Joi = require("joi");
const { readClients, createClient, updateClient, deleteClient, readClientById, readAllClient } = require("../controller/client.controller");
const route = express.Router();

const validation = Joi.object({
  clientDetail: {
    remark: Joi.string().optional().allow(""),
    company_name: Joi.string().min(1).max(50).trim(true).required().label('Company Name'),
    pdf_name: Joi.string().optional().allow(""),
    rate_sheet: Joi.string().optional().allow(""),
    payment_terms: Joi.string().optional().allow(""),
    number_str: Joi.number().optional().allow(""),
    client_type: Joi.array().optional().allow(""),
    active: Joi.boolean().default(false),
  },
});
const clientValidation = async (req, res, next) => {
  const payload = {
    clientDetail: {
      company_name: req.body.companyName,
      remark: req.body.remark,
      rate_sheet: req.body.ratesheet,
      payment_terms: req.body.payment,
      client_type: req.body.clientType,
      active: req.body.active,

    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    console.log(error);
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};


route.get("/", readClients)
route.get("/one/:id", readClientById)
route.get("/all", readAllClient)
route.post("/create", clientValidation, createClient)
route.post("/update/:id", clientValidation, updateClient)
route.post("/delete/:id", deleteClient)

module.exports = route