const express = require("express");
const Joi = require("joi");
const { readVehicle, readVehicleById, createVehicle, updateVehicle, deleteVehicle, readAllVehicle } = require("../controller/vehicle.controller");
const route = express.Router();

const validation = Joi.object({
  vehicleDetail: {
    remark: Joi.string().optional().allow(""),
    unit_number: Joi.string().min(1).max(50).trim(true).required().label('Unit Number'),
    make: Joi.string().optional().allow(""),
    model: Joi.string().optional().allow(""),
    year: Joi.string().optional().allow(""),

  },
});

const vehicleValidation = async (req, res, next) => {
  const payload = {
    vehicleDetail: {
      remark: req.body.remark,
      unit_number: req.body.unit_number,
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,

    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};



route.get("/", readVehicle)
route.get("/all", readAllVehicle)
route.get("/one/:id", readVehicleById)
route.post("/create", vehicleValidation, createVehicle)
route.post("/update/:id", vehicleValidation, updateVehicle)
route.post("/delete/:id", deleteVehicle)

module.exports = route