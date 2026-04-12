const logger = require("../middleware/logger");
const vehicle = require("../models/vehicle");

exports.readVehicle = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === "") {
      var totalDataCount = await vehicle.countDocuments({ is_deleted: false });

      var allUsers = await vehicle.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      const searchQuery = search
        ? [
          { model: { $regex: search, $options: "i" } },
          { make: { $regex: search, $options: "i" } },
          { year: { $regex: search, $options: "i" } },
          { unit_number: { $regex: search, $options: "i" } }
        ]
        : [];

      var totalDataCount = await vehicle.countDocuments({
        is_deleted: false,
        ...(searchQuery.length ? { $or: searchQuery } : {}), // Apply search condition only if search is not empty
      });

      var allUsers = await vehicle.aggregate([
        {
          $match: {
            is_deleted: false,
            ...(searchQuery.length ? { $or: searchQuery } : {}),
          }
        },
        { $sort: { createdAt: parseInt(sortOrder) || -1 } }, // Default sorting to newest (-1)
        { $skip: parseInt(data) || 0 },
        { $limit: parseInt(per_page) || 10 }
      ]);
    }
    logger.accessLog.info("vehicle fetch fail");
    res.send({
      statusCode: 200,
      message: "vehicle fetch Successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("vehicle fetch fail");
    res.send({ statusCode: 500, message: "vehicle fetch fail", error: err });
  }
};

exports.readAllVehicle = async (req, res) => {
  try {
    const userData = await vehicle.find({ is_deleted: false }).sort({ createdAt: -1 });
    logger.accessLog.info("vehicle fetch success");
    res.send({
      statusCode: 200,
      message: "vehicle fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("vehicle fetch fail");
    res.send({ statusCode: 500, message: "vehicle fetch fail", error: err });
  }
};

exports.readVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await vehicle.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info("vehicle fetch success");
    res.send({
      statusCode: 200,
      message: "vehicle fetch successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("vehicle fetch fail");
    res.send({ statusCode: 500, message: "vehicle fetch fail", error: err });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const newVehicle = await vehicle.create(req.body);
    if (newVehicle) {
      await newVehicle.save();
      logger.accessLog.info("vehicle create successfully");
      res.send({
        statusCode: 200,
        message: "The vehicle has been created successfully",
        vehicle: newVehicle,
      });
    }
  } catch (err) {
    logger.errorLog.error("vehicle create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateVehicle = await vehicle.findByIdAndUpdate(id, req.body);
    if (updateVehicle) {
      await updateVehicle.save();
      logger.accessLog.info("vehicle update successfully");
      res.send({
        statusCode: 200,
        message: "The vehicle has been updated successfully",
        vehicle: updateVehicle,
      });
    }
  } catch (err) {
    logger.errorLog.error("vehicle update fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteVehicle = await vehicle.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("vehicle delete successfully");
    res.send({
      statusCode: 200,
      message: "The vehicle has been deleted successfully",
      vehicle: deleteVehicle,
    });
  } catch (err) {
    logger.errorLog.error("vehicle delete fail");
    res.send({
      statusCode: 500,
      message:
        "Oops Something went wrong. Please contact the administratorfail",
      error: err,
    });
  }
};
