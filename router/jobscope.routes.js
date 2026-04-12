const express = require("express");
const Joi = require("joi");
const { readJobScope, readJobScopeById, createJobScope, updateJobScope, deleteJobScope, readAllJobScope } = require("../controller/jobscope.controller");
const route = express.Router();

const validation = Joi.object({
  jobscopeDetail: {
    remark: Joi.string().optional().allow(""),
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),
  },
});

const jobscopeValidation = async (req, res, next) => {
  const payload = {
    jobscopeDetail: {
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


route.get("/", readJobScope)
route.get("/all", readAllJobScope)
route.get("/one/:id", readJobScopeById)
route.post("/create", jobscopeValidation, createJobScope)
route.post("/update/:id", jobscopeValidation, updateJobScope)
route.post("/delete/:id", deleteJobScope)

module.exports = route