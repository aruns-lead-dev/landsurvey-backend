const logger = require("../middleware/logger")
const office = require("../models/office")

exports.readOffice = async (req, res) => {
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
            var totalDataCount = await office.countDocuments({ is_deleted: false })
            var allUsers = await office.aggregate([
                { $match: { is_deleted: false } }, // Filter out deleted records
                { $sort: { createdAt: sortOrder } }, // Sorting dynamically
                { $skip: parseInt(data) }, // Skipping records for pagination
                { $limit: parseInt(per_page) }, // Limiting the number of records
            ]);
        }
        else {
            var totalDataCount = await office.countDocuments({ name: { $regex: search, $options: "i" }, is_deleted: false })
            var allUsers = await office.aggregate([
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
        logger.accessLog.info("office fetch fail")
        res.send({ statusCode: 200, message: "office fetch successfully", total: totalDataCount, data: allUsers })
    }
    catch (err) {
        logger.errorLog.error("office fetch fail")
        res.send({ statusCode: 500, message: "office fetch fail", error: err })
    }
}

exports.readOfficeById = async (req, res) => {
    try {
        const { id } = req.params
        const userData = await office.findOne({ _id: id, is_deleted: false })
        logger.accessLog.info("office fetch success")
        res.send({ statusCode: 200, message: "office fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("office fetch fail")
        res.send({ statusCode: 500, message: "office fetch fail", error: err })
    }
}

exports.readAllOffice = async (req, res) => {
    try {
        const userData = await office.find({ is_deleted: false }).sort({ createdAt: -1 })
        logger.accessLog.info("office fetch success")
        res.send({ statusCode: 200, message: "office fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("office fetch fail")
        res.send({ statusCode: 500, message: "office fetch fail", error: err })
    }
}



exports.createOffice = async (req, res) => {
    try {
        const newOffice = await office.create(req.body)
        if (newOffice) {
            await newOffice.save()
            logger.accessLog.info("office create fail")
            res.send({ statusCode: 200, message: "The office has been created successfully", office: newOffice })
        }
    }
    catch (err) {
        logger.errorLog.error("office create fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.updateOffice = async (req, res) => {
    try {
        const { id } = req.params
        const updateOffice = await office.findByIdAndUpdate(id, req.body)
        if (updateOffice) {
            await updateOffice.save()
            logger.accessLog.info("office updated successfully")
            res.send({ statusCode: 200, message: "The office has been updated successfully", office: updateOffice })
        }
    }
    catch (err) {
        logger.errorLog.error("office update fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.deleteOffice = async (req, res) => {
    try {
        const { id } = req.params
        const deleteOffice = await office.findByIdAndUpdate(id, { $set: { is_deleted: true } })
        logger.accessLog.info("office delete fail")
        res.send({ statusCode: 200, message: "The office has been deleted successfully", office: deleteOffice })
    }
    catch (err) {
        logger.errorLog.error("office delete fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}