const express = require("express");
const Joi = require("joi");
const { readPaymentterm, readPaymenttermById, createPaymentterm, updatePaymentterm, deletePaymentterm, readAllPaymentterm } = require("../controller/paymentterm.controller");
const route = express.Router();


const validation = Joi.object({
  paymentDetail: {
    remark: Joi.string().optional().allow(""),
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),

  },
});

const paymentValidation = async (req, res, next) => {
  const payload = {
    paymentDetail: {
      remark: req.body.remark,
      name: req.body.name,
    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};


route.get("/", readPaymentterm)
route.get("/all", readAllPaymentterm)
route.get("/one/:id", readPaymenttermById)
route.post("/create", paymentValidation, createPaymentterm)
route.post("/update/:id", paymentValidation, updatePaymentterm)
route.post("/delete/:id", deletePaymentterm)

module.exports = route