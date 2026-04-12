const express = require("express");
const Joi = require('joi')
const { readState, readStateById, createState, updateState, deleteState, readAllState } = require("../controller/state.controller");
const route = express.Router()

const validation = Joi.object({
  stateDetail: {
    name: Joi.string().trim(true).required().label('Name'),
    remark: Joi.string().optional().allow(""),
  },
});

const stateValidation = async (req, res, next) => {
  const payload = {
    stateDetail: {
      name: req.body.name,
      remark: req.body.remark,
    },
  };

  const { error } = validation.validate(payload, { errors: { label: "key", wrap: { label: false } } });
  if (error) {
    return res.json({ status: 403, message: error.details[0].message, success: false });
  } else {
    next();
  }
};


route.get("/", readState)
route.get("/all", readAllState)
route.get("/one/:id", readStateById)
route.post("/create", stateValidation, createState)
route.post("/update/:id", stateValidation, updateState)
route.post("/delete/:id", deleteState)

module.exports = route