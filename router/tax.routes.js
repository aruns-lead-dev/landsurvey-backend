const express = require("express");
const Joi = require("joi");
const { readTax, readTaxById, createTax, updateTax, deleteTax, readAllTax } = require("../controller/tax.controller");
const route = express.Router();


const validation = Joi.object({
  taxDetail: {
    name: Joi.string().trim(true).required().label('Name'),
    percentage: Joi.number().required().label('Percentage'),
  },
});

const taxValidation = async (req, res, next) => {
  const payload = {
    taxDetail: {
      name: req.body.name,
      percentage: req.body.percentage,

    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};


route.get("/", readTax)
route.get("/all", readAllTax)
route.get("/one/:id", readTaxById)
route.post("/create", taxValidation, createTax)
route.post("/update/:id", taxValidation, updateTax)
route.post("/delete/:id", deleteTax)

module.exports = route