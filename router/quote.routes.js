const express = require("express");
const Joi = require("joi");
const { readQuotes, readQuoteById, readAllQuote, createQuote, updateQuote, deleteQuote } = require("../controller/quote.controller");

const route = express.Router();

const validation = Joi.object({
  quoteDetail: {
    remark: Joi.string().optional().allow(""),
    client_id: Joi.string().required(),
    project_manager: Joi.array().required(),
    ratesheet_id: Joi.string().required(),
    description: Joi.string().optional().allow(""),
    estimated_hour: Joi.number().optional().allow(""),
    active: Joi.boolean().default(false),
  },
});
const quoteValidation = async (req, res, next) => {
  const payload = {
    quoteDetail: {
      remark: req.body.remark,
      client_id: req.body.client_id,
      project_manager: req.body.project_manager,
      ratesheet_id: req.body.ratesheet_id,
      description: req.body.description,
      estimated_hour: req.body.estimated_hour,
      active: req.body.active,
    },
  };

  const { error } = validation.validate(payload, {
    errors: { label: "key", wrap: { label: false } },
  });
  if (error) {
    console.log(error);
    return res.json({
      status: 403,
      message: error.details[0].message,
      success: false,
    });
  } else {
    next();
  }
};

route.get("/", readQuotes);
route.get("/one/:id", readQuoteById);
route.get("/all", readAllQuote);
route.post("/create", quoteValidation, createQuote);
route.post("/update/:id", quoteValidation, updateQuote);
route.post("/delete/:id", deleteQuote);

module.exports = route;
