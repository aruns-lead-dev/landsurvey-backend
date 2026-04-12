const express = require("express");
const Joi = require("joi");
const { readJobStatus, readJobStatusById, createJobStatus, updateJobStatus, deleteJobStatus, readAllJobStatus } = require("../controller/jobstatus.controller");
const route = express.Router();

const validation = Joi.object({
  jobstatusDetail: {
    remark: Joi.string().optional().allow(""),
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),
  },
});

const jobstatusValidation = async (req, res, next) => {
  const payload = {
    jobstatusDetail: {
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


route.get("/", readJobStatus)
route.get("/all", readAllJobStatus)
route.get("/one/:id", readJobStatusById)
route.post("/create", jobstatusValidation, createJobStatus)
route.post("/update/:id", jobstatusValidation, updateJobStatus)
route.post("/delete/:id", deleteJobStatus)

module.exports = route