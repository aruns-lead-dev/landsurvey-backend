const express = require("express");
const Joi = require("joi");
const { readFee, readFeeById, createFee, updateFee, deleteFee, readAllFee } = require("../controller/fee.controller");
const route = express.Router();


const validation = Joi.object({
  feeDetail: {
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),
    percentage: Joi.number().required().label('Percentage'),
  },
});

const feeValidation = async (req, res, next) => {
  const payload = {
    feeDetail: {
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

route.get("/", readFee)
route.get("/all", readAllFee)
route.get("/one/:id", readFeeById)
route.post("/create", feeValidation, createFee)
route.post("/update/:id", feeValidation, updateFee)
route.post("/delete/:id", deleteFee)

module.exports = route