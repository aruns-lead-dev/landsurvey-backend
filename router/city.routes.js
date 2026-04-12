const express = require("express");
const Joi = require('joi')
const { readCity, readCityById, createCity, updateCity, deleteCity, readAllCity } = require("../controller/city.controller");
const route = express.Router();

const validation = Joi.object({
  cityDetail: {
    name: Joi.string().trim(true).required().label('Name'),
    remark: Joi.string().optional().allow(""),
    state_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('must be an oid')
  },
});

const cityValidation = async (req, res, next) => {
  const payload = {
    cityDetail: {
      name: req.body.name,
      remark: req.body.remark,
      state_id: req.body.state_id
    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};

route.get("/", readCity)
route.get("/all", readAllCity)
route.get("/one/:id", readCityById)
route.post("/create", cityValidation, createCity)
route.post("/update/:id", cityValidation, updateCity)
route.post("/delete/:id", deleteCity)

module.exports = route