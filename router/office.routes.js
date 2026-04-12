const express = require("express");
const Joi = require("joi");
const { readOffice, readOfficeById, createOffice, updateOffice, deleteOffice, readAllOffice } = require("../controller/office.controller");
const route = express.Router();


const validation = Joi.object({
  cityDetail: {
    name: Joi.string().trim(true).required().label('Name'),
    remark: Joi.string().optional().allow(""),
  },
});

const officeValidation = async (req, res, next) => {
  const payload = {
    cityDetail: {
      name: req.body.name,
      remark: req.body.remark,

    },
  };

  const { error } = validation.validate(payload, { errors: { label: 'key', wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};


route.get("/", readOffice)
route.get("/all", readAllOffice)
route.get("/one/:id", readOfficeById)
route.post("/create", officeValidation, createOffice)
route.post("/update/:id", officeValidation, updateOffice)
route.post("/delete/:id", deleteOffice)

module.exports = route