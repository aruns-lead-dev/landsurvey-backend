const logger = require('../middleware/logger');
const costiteam = require('../models/costiteam');

exports.readCostIteam = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    if (page === undefined) {
      page = '1';
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === '') {
      var totalDataCount = await costiteam.countDocuments({
        is_deleted: false,
      });

      var allUsers = await costiteam.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      var totalDataCount = await costiteam.countDocuments({
        name: { $regex: search, $options: 'i' },
        is_deleted: false,
      });
      var allUsers = await costiteam.aggregate([
        {
          $match: {
            is_deleted: false,
            name: { $regex: search, $options: 'i' },
          },
        },
        { $sort: { createdAt: sortOrder } }, // Dynamic sorting
        { $skip: parseInt(data) }, // Skipping records for pagination
        { $limit: parseInt(per_page) }, // Limiting the number of records
      ]);
    }
    logger.accessLog.info('cost item fetch fail');
    res.send({
      statusCode: 200,
      message: 'cost item fetch successfully',
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error('cost item fetch fail');
    res.send({ statusCode: 500, message: 'cost item fetch fail', error: err });
  }
};

exports.readAllCostIteam = async (req, res) => {
  try {
    const userData = await costiteam
      .find({ is_deleted: false, active: true })
      .sort({ createdAt: -1 });
    logger.accessLog.info('cost item fetch success');
    res.send({
      statusCode: 200,
      message: 'cost item fetch successfully',
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error('cost item fetch fail');
    res.send({ statusCode: 500, message: 'cost item fetch fail', error: err });
  }
};
exports.readCostIteamById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await costiteam.findOne({ _id: id, is_deleted: false });
    logger.accessLog.info('cost item fetch success');
    res.send({
      statusCode: 200,
      message: 'cost item fetch successfully',
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error('cost item fetch fail');
    res.send({ statusCode: 500, message: 'cost item fetch fail', error: err });
  }
};

exports.createCostIteam = async (req, res) => {
  try {
    const newCostIteam = await costiteam.create(req.body);
    if (newCostIteam) {
      await newCostIteam.save();
      logger.accessLog.info('cost item create fail');
      res.send({
        statusCode: 200,
        message: 'The cost item has been created successfully',
        costiteam: newCostIteam,
      });
    }
  } catch (err) {
    logger.errorLog.error('cost item create fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateCostIteam = async (req, res) => {
  try {
    const { id } = req.params;
    const updateCostIteam = await costiteam.findByIdAndUpdate(id, req.body);
    if (updateCostIteam) {
      await updateCostIteam.save();
      logger.accessLog.info('cost item update fail');
      res.send({
        statusCode: 200,
        message: 'The cost item has been updated successfully',
        costiteam: updateCostIteam,
      });
    }
  } catch (err) {
    logger.errorLog.error('cost item update fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.deleteCostIteam = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteCostIteam = await costiteam.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info('cost item delete fail');
    res.send({
      statusCode: 200,
      message: 'The cost item has been deleted successfully',
      costiteam: deleteCostIteam,
    });
  } catch (err) {
    logger.errorLog.error('cost item delete fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};
