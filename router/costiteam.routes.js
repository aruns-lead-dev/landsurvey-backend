const express = require("express");
const Joi = require("joi");
const { readCostIteam, readCostIteamById, createCostIteam, updateCostIteam, deleteCostIteam, readAllCostIteam } = require("../controller/costiteam.controller");
const route = express.Router();


const validation = Joi.object({
    costitemDetail: {
        name: Joi.string().trim(true).required().label("Name"),
        unit: Joi.string().trim(true).required().label("Unit"),
        unit_cost: Joi.string().trim(true).required().label("Unit Cost"),
        hourly_cost: Joi.string().optional().allow(""),
        gl_code: Joi.string().optional().allow(""),
        category: Joi.string().trim(true).required().label("Category"),
        sub_category: Joi.string().trim(true).required().label("Sub Category"),
        tax_exempt: Joi.boolean().default(false),
        active: Joi.boolean().default(false),
        remark: Joi.string().optional().allow(""),

    },
});

const costitemValidation = async (req, res, next) => {
    const payload = {
        costitemDetail: {
            name: req.body.name,
            unit: req.body.unit,
            unit_cost: req.body.unit_cost,
            hourly_cost: req.body.hourly_cost,
            gl_code: req.body.gl_code,
            category: req.body.category,
            sub_category: req.body.sub_category,
            tax_exempt: req.body.tax_exempt,
            active: req.body.active,
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

    
route.get("/", readCostIteam)
route.get("/all", readAllCostIteam)
route.get("/one/:id", readCostIteamById)
route.post("/create", costitemValidation, createCostIteam)
route.post("/update/:id", costitemValidation, updateCostIteam)
route.post("/delete/:id", deleteCostIteam)

module.exports = route