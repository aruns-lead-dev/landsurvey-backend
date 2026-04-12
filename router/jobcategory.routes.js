const express = require("express");
const Joi = require("joi");
const { readJobCategory, readJobCategoryById, createJobCategory, updateJobCategory, deleteJobCategory, readAllJobCategory } = require("../controller/jobcategory.controller");
const route = express.Router();


const validation = Joi.object({
  jobcategoryDetail: {
    remark: Joi.string().optional().allow(""),
    name: Joi.string().min(1).max(50).trim(true).required().label('Name'),
  },
});

const jobcategoryValidation = async (req, res, next) => {
  const payload = {
    jobcategoryDetail: {
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


route.get("/", readJobCategory)
route.get("/all", readAllJobCategory)
route.get("/one/:id", readJobCategoryById)
route.post("/create", jobcategoryValidation, createJobCategory)
route.post("/update/:id", jobcategoryValidation, updateJobCategory)
route.post("/delete/:id", deleteJobCategory)

module.exports = route