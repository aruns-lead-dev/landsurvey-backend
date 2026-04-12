const express = require("express");
const Joi = require("joi");
const { readClientType, readClientTypeById, createClientType, updateClientType, deleteClientType, readAllClientType } = require("../controller/clienttype.controller");
const route = express.Router();

const validation = Joi.object({
  clienttypeDetail: {
    name: Joi.string().trim(true).required().label('Name'),
    remark: Joi.string().optional().allow(""),

  },
});

const clienttypeValidation = async (req, res, next) => {
  const payload = {
    clienttypeDetail: {
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


route.get("/", readClientType)
route.get("/all", readAllClientType)
route.get("/one/:id", readClientTypeById)
route.post("/create", clienttypeValidation, createClientType)
route.post("/update/:id", clienttypeValidation, updateClientType)
route.post("/delete/:id", deleteClientType)

module.exports = route