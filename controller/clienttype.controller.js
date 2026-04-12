const logger = require("../middleware/logger")
const clienttype = require("../models/clienttype")

exports.readClientType = async (req, res) => {
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
            var totalDataCount = await clienttype.countDocuments({ is_deleted: false })
            var allUsers = await clienttype.aggregate([
                { $match: { is_deleted: false } },
                { $sort: { createdAt: sortOrder } },
                { $skip: parseInt(data) },
                { $limit: parseInt(per_page) },
            ]);

        }
        else {
            var totalDataCount = await clienttype.countDocuments({ name: { $regex: search, $options: 'i' }, is_deleted: false })
            var allUsers = await clienttype.aggregate([
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
        logger.accessLog.info("client_type fetch fail")
        res.send({ statusCode: 200, message: "client_type fetch successfully", total: totalDataCount, data: allUsers })
    }
    catch (err) {
        logger.errorLog.error("client_type fetch fail")
        res.send({ statusCode: 500, message: "client_type fetch fail", error: err })
    }
}

exports.readAllClientType = async (req, res) => {
    try {
        const userData = await clienttype.find({ is_deleted: false }).sort({ createdAt: 1 })
        logger.accessLog.info("client_type fetch success")
        res.send({ statusCode: 200, message: "client_type fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("client_type fetch fail")
        res.send({ statusCode: 500, message: "client_type fetch fail", error: err })
    }
}

exports.readClientTypeById = async (req, res) => {
    try {
        const { id } = req.params
        const userData = await clienttype.findOne({ _id: id, is_deleted: false })
        logger.accessLog.info("client_type fetch success")
        res.send({ statusCode: 200, message: "client_type fetch successfully", data: userData })
    }
    catch (err) {
        logger.errorLog.error("client_type fetch fail")
        res.send({ statusCode: 500, message: "client_type fetch fail", error: err })
    }
}



exports.createClientType = async (req, res) => {
    try {
        const newClientType = await clienttype.create(req.body)
        if (newClientType) {
            await newClientType.save()
            logger.accessLog.info("client_type create successfully")
            res.send({ statusCode: 200, message: "The client type has been created successfully", clienttype: newClientType })
        }
    }
    catch (err) {
        logger.errorLog.error("client_type create fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.updateClientType = async (req, res) => {
    try {
        const { id } = req.params
        const updateClientType = await clienttype.findByIdAndUpdate(id, req.body)
        if (updateClientType) {
            await updateClientType.save()
            logger.accessLog.info("client_type update successfully")
            res.send({ statusCode: 200, message: "The client type has been updated successfully", clienttype: updateClientType })
        }
    }
    catch (err) {
        logger.errorLog.error("client_type update fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}



exports.deleteClientType = async (req, res) => {
    try {
        const { id } = req.params
        const deleteClientType = await clienttype.findByIdAndUpdate(id, { $set: { is_deleted: true } })
        logger.accessLog.info("client_type delete successfully")
        res.send({ statusCode: 200, message: "The client type has been deleted successfully", clienttype: deleteClientType })
    }
    catch (err) {
        logger.errorLog.error("clienttype delete fail")
        res.send({ statusCode: 500, message: "Oops Something went wrong. Please contact the administrator", error: err })
    }
}