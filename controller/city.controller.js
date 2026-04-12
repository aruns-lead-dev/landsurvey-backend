const { default: mongoose } = require("mongoose");
const logger = require("../middleware/logger");
const { CITY_PIPELINE } = require("../middleware/pipelines");
const city = require("../models/city");

exports.readCity = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortField = req.query.sortField === "undefined" ? "sortCreatedAt" : req.query.sortField;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === "") {
      var totalDataCount = await city.countDocuments({ is_deleted: false });

      var allUsers = await city.aggregate([
        ...CITY_PIPELINE,
        { $match: { is_deleted: false } },
        { $sort: { [sortField]: sortOrder, sortCreatedAt: -1 } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      const matchStage = {
        $match: {
          $and: [
            { is_deleted: false },
            {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { "state.name": { $regex: search, $options: "i" } },
              ],
            },
          ],
        },
      }
      var totalData = await city.aggregate([
        {
          $lookup: {
            from: "states",
            localField: "state_id",
            foreignField: "_id",
            as: "state"
          }
        },
        { $unwind: "$state" },
        matchStage, // ✅ Apply `$match` AFTER `$lookup`
        {
          $project: {
            name: "$name",
            state: "$state.name",
            statess: "$state.name",
          },
        },
        { $count: "totalCount" },
      ]);

      var totalDataCount = totalData[0].totalCount
      var allUsers = await city.aggregate([
        ...CITY_PIPELINE,
        {
          $match: {
            $and: [
              { is_deleted: false },
              {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { statess: { $regex: search, $options: "i" } },
                ],
              },
            ],
          },
        },
        { $sort: { [sortField]: sortOrder, sortCreatedAt: -1 } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    }
    logger.accessLog.info("city fetch fail");
    res.send({
      statusCode: 200,
      message: "City Fetch Successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("city fetch fail");
    res.send({ statusCode: 500, message: "City Fetch Fail", error: err });
  }
};

exports.readCityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await city.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      ...CITY_PIPELINE,
    ]);
    logger.accessLog.info("City fetch success");
    res.send({
      statusCode: 200,
      message: "City Fetch Successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("city fetch fail");
    res.send({ statusCode: 500, message: "City Fetch Fail", error: err });
  }
};

exports.readAllCity = async (req, res) => {
  try {
    const userData = await city.aggregate([
      {
        $match: { is_deleted: false },
      },
      ...CITY_PIPELINE,
      { $sort: { createdAt: -1 } },
    ]);
    logger.accessLog.info("city fetch success");
    res.send({
      statusCode: 200,
      message: "City Fetch Successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("city fetch fail");
    res.send({ statusCode: 500, message: "City Fetch Fail", error: err });
  }
};

exports.createCity = async (req, res) => {
  try {
    const { name, state_id, remark } = req.body;

    const newCity = await city.create({
      name: name,
      state_id: state_id,
      remark: remark,
    });
    if (newCity) {
      await newCity.save();
      logger.accessLog.info("city create fail");
      res.send({
        statusCode: 200,
        message: "The city has been created successfully",
        city: newCity,
      });
    }
  } catch (err) {
    logger.errorLog.error("city create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state_id, remark } = req.body;
    const updateCity = await city.findByIdAndUpdate(id, {
      name: name,
      state_id: state_id,
      remark: remark,
    });
    if (updateCity) {
      await updateCity.save();
      logger.accessLog.info("city update fail");
      res.send({
        statusCode: 200,
        message: "The city has been updated successfully",
        city: updateCity,
      });
    }
  } catch (err) {
    logger.errorLog.error("city update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteCity = await city.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("city delete fail");
    res.send({
      statusCode: 200,
      message: "The city has been deleted successfully",
      city: deleteCity,
    });
  } catch (err) {
    logger.errorLog.error("city delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
