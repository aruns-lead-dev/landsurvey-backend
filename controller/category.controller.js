const logger = require("../middleware/logger")
const category = require("../models/category")

exports.readCategory = async (req, res) => {
    try {
        var page = req.query.page
        var per_page = req.query.per_page
        if (page === undefined) {
            page = '1'
        }
        if (per_page === undefined) {
            per_page = process.env.PAGINATION
        }
        const data = page * per_page - per_page
        const totalDataCount = await category.countDocuments({ role: { $in: ["employee", "manager"] } })
        const allUsers = await category.find({}).skip(data).limit(per_page)
        logger.accessLog.info("category fetch fail")
        res.send({ statusCode: 200, message: "category fetch successfully", total: totalDataCount, data: allUsers })
    }
    catch (err) {
        logger.errorLog.error("user fetch fail")
        res.send({ statusCode: 500, message: "user fetch fail", error: err })
    }
}