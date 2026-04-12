const logger = require("../middleware/logger")
const paymentterm = require("../models/paymentterm")

exports.readPaymentterm = async (req, res) => {
    try {
        var page = req.query.page
        var per_page = req.query.per_page
        var search = req.query.search
        var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        if (page === undefined) {
            page = '1'
        }
        if (per_page === undefined) {
            per_page = process.env.PAGINATION
        }
        const data = page * per_page - per_page
        if (search === "") {
            var totalDataCount = await paymentterm.countDocuments({ is_deleted: false })
            var allUsers = await paymentterm.aggregate([
                { $match: { is_deleted: false } }, // Filter out deleted records
                { $sort: { createdAt: sortOrder } }, // Sorting dynamically
                { $skip: parseInt(data) }, // Skipping records for pagination
                { $limit: parseInt(per_page) }, // Limiting the number of records
            ]);

        }
        else {
            var totalDataCount = await paymentterm.countDocuments({ name: { $regex: search, $options: "i" }, is_deleted: false })
            var allUsers = await paymentterm.aggregate([
                {
                    $match: {
                        is_deleted: false,
                        name: { $regex: search, $options: "i" },
                    }
                },
                { $sort: { createdAt: sortOrder } }, // Dynamic sorting
                { $skip: parseInt(data) }, // Skipping records for pagination
                { $limit: parseInt(per_page) } // Limiting the number of records
            ]);

        }
        logger.accessLog.info("paymentterms fetch fail")
        res.send({ statusCode: 200, message: "paymentterms fetch successfully", total: totalDataCount, data: allUsers })
    }
    catch (err) {
        logger.errorLog.error("paymentterms fetch fail")
        res.send({ statusCode: 500, message: "paymentterms fetch fail", error: err })
    }
}

exports.readAllPaymentterm = async (req, res) => {
    try {
        const userData = await paymentterm.find({ is_deleted: false }).sort({ createdAt: -1 })
        logger.accessLog.info("paymentterm fetch success")
        res.send({ statusCode: 200, message: "paymentterm fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("paymentterm fetch fail")
        res.send({ statusCode: 500, message: "paymentterm fetch fail", error: err })
    }
}


exports.readPaymenttermById = async (req, res) => {
    try {
        const { id } = req.params
        const userData = await paymentterm.findOne({ _id: id, is_deleted: false })
        logger.accessLog.info("paymentterm fetch success")
        res.send({ statusCode: 200, message: "paymentterm fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("paymentterm fetch fail")
        res.send({ statusCode: 500, message: "paymentterm fetch fail", error: err })
    }
}



exports.createPaymentterm = async (req, res) => {
    try {
        const newPaymentterm = await paymentterm.create(req.body)
        if (newPaymentterm) {
            await newPaymentterm.save()
            logger.accessLog.info("paymentterm create successfully")
            res.send({ statusCode: 200, message: "The payment term has been created successfully", paymentterm: newPaymentterm })
        }
    }
    catch (err) {
        logger.errorLog.error("paymentterm create fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.updatePaymentterm = async (req, res) => {
    try {
        const { id } = req.params
        const updatePaymentterm = await paymentterm.findByIdAndUpdate(id, req.body)
        if (updatePaymentterm) {
            await updatePaymentterm.save()
            logger.accessLog.info("paymentterm update successfully")
            res.send({ statusCode: 200, message: "The payment term has been updated successfully", paymentterm: updatePaymentterm })
        }
    }
    catch (err) {
        Ratesheet
        logger.errorLog.error("paymentterm update fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.deletePaymentterm = async (req, res) => {
    try {
        const { id } = req.params
        const deletePaymentterm = await paymentterm.findByIdAndUpdate(id, { $set: { is_deleted: true } })
        logger.accessLog.info("paymentterm delete successfully")
        res.send({ statusCode: 200, message: "The payment term has been deleted successfully", paymentterm: deletePaymentterm })
    }
    catch (err) {
        logger.errorLog.error("paymentterm delete fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}