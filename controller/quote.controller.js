const logger = require('../middleware/logger');
const mongoose = require('mongoose');
const quote = require('../models/quote');
const Jimp = require('jimp');
const { QUOTE_PIPELINE } = require('../middleware/pipelines');
const { default: axios } = require('axios');
const task = require('../models/task');

exports.readQuotes = async (req, res) => {
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
      var totalDataCount = await quote.countDocuments({ is_deleted: false });
      var allQuotes = await quote.aggregate([
        { $match: { is_deleted: false } },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...QUOTE_PIPELINE,
      ]);
    } else {
      var totalDataCount = await quote.countDocuments({
        $and: [
          { is_deleted: false },
          { $or: [{ number_str: { $regex: search } }] },
        ],
      });
      var allQuotes = await quote.aggregate([
        {
          $match: {
            $and: [
              { is_deleted: false },
              { $or: [{ number_str: { $regex: search } }] },
            ],
          },
        },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...QUOTE_PIPELINE,
      ]);
    }
    logger.accessLog.info('quote fetch successfully');
    res.send({
      statusCode: 200,
      massage: 'The quote has been fetched successfully',
      total: totalDataCount,
      data: allQuotes,
    });
  } catch (err) {
    logger.errorLog.error('quote fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the quote',
      error: err,
    });
  }
};

exports.readQuoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const quoteData = await quote.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      ...QUOTE_PIPELINE,
    ]);
    logger.accessLog.info('quote fetch success');
    res.send({
      statusCode: 200,
      message: 'The quote has been fetched successfully',
      data: quoteData,
    });
  } catch (err) {
    logger.errorLog.error('quote fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the quote',
      error: err,
    });
  }
};

exports.readAllQuote = async (req, res) => {
  try {
    const quoteData = await quote.aggregate([
      {
        $match: { is_deleted: false },
      },
      ...QUOTE_PIPELINE,
    ]);
    logger.accessLog.info('quote fetch success');
    res.send({
      statusCode: 200,
      message: 'The quote has been fetched successfully',
      data: quoteData,
    });
  } catch (err) {
    logger.errorLog.error('quote fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the quote',
      error: err,
    });
  }
};

exports.createQuote = async (req, res) => {
  try {
    const {
      client_id,
      project_manager,
      ratesheet_id,
      job_id,
      description,
      total_estimated_hour,
      total_cost_hour,
      labourItem,
      materialItem,
      fixItem,
      active,
      remark,
      attachment,
      quote_number,
    } = req.body;

    const data = attachment?.slice(22);
    const buffer = Buffer.from(data, 'base64');

    Jimp.read(buffer, (error, res) => {
      if (error) {
        logger.errorLog.error(
          `error at catch from image generation : ${error}`,
        );
      } else {
        res
          .quality(5)
          .write(
            __dirname +
              `/../public/quote/attachments/${Date.now()}_${name}.png`,
          );
      }
    });

    const projectManagerArr = project_manager.map((element) => {
      return element.id ? element.id : element;
    });

    const newQuote = await quote.create({
      client_id: client_id,
      quote_number: quote_number,
      project_manager: projectManagerArr,
      ratesheet_id: ratesheet_id,
      job_id: job_id,
      description: description,
      total_estimated_hour: total_estimated_hour,
      total_cost_hour: total_cost_hour,
      billable_line_items: {
        labourItem: labourItem,
        materialItem: materialItem,
        fixItem: fixItem,
      },
      active: active,
      remark: remark,
      attachment: `${Date.now()}_${quote_number}.png`,
    });
    if (newQuote) {
      await newQuote.save();
      await quote.findByIdAndUpdate(newQuote._id, {
        $set: { number_str: newQuote.number.toString().padStart(6, '0') },
      });
      logger.accessLog.info('quote create successfully');
      res.send({
        statusCode: 200,
        message: 'The quote has been created successfully',
        quote: newQuote,
      });
    }
  } catch (err) {
    logger.errorLog.error('quote create fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id,
      project_manager,
      ratesheet_id,
      job_id,
      description,
      total_estimated_hour,
      total_cost_hour,
      labourItem,
      materialItem,
      fixItem,
      active,
      remark,
      attachment,
      quote_number,
    } = req.body;
    const data = attachment?.slice(22);
    const buffer = Buffer.from(data, 'base64');
    Jimp.read(buffer, (error, res) => {
      if (error) {
        logger.errorLog.error(
          `error at catch from image generation : ${error}`,
        );
      } else {
        res
          .quality(5)
          .write(
            __dirname + `/../public/quote/attachments/${client_id}_${name}.png`,
          );
      }
    });

    const projectManagerArr = project_manager.map((element) => {
      return element.id ? element.id : element;
    });

    const updateQuoteData = await quote.findByIdAndUpdate(id, {
      client_id: client_id,
      project_manager: projectManagerArr,
      ratesheet_id: ratesheet_id,
      quote_number: quote_number,
      job_id: job_id,
      description: description,
      total_estimated_hour: total_estimated_hour,
      total_cost_hour: total_cost_hour,
      billable_line_items: {
        labourItem: labourItem,
        materialItem: materialItem,
        fixItem: fixItem,
      },
      active: active,
      remark: remark,
      attachment: `${client_id}_${quote_number}.png`,
    });
    if (updateQuoteData) {
      await updateQuoteData.save();
      logger.accessLog.info('quote update successfully');
      res.send({
        statusCode: 200,
        message: 'The quote has been updated successfully',
        client: updateQuoteData,
      });
    }
  } catch (err) {
    logger.errorLog.error('quote update fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.deleteQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const quoteDetails = await quote.findOne({
      _id: mongoose.Types.ObjectId(id),
      is_deleted: false,
    });
    const TaskRelatedDataExists = await task.findOne({
      quote_id: quoteDetails.number_str,
      is_deleted: false,
    });
    if (TaskRelatedDataExists) {
      return res.send({
        statusCode: 400,
        message:
          'Cannot delete. The quote is referenced in the Task collection.',
      });
    }

    const deleteQuoteData = await quote.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    if (deleteQuoteData) {
      deleteQuoteData.save();
      logger.accessLog.info('quote delete successfully');
      res.send({
        statusCode: 200,
        message: 'The quote has been deleted successfully',
        quote: deleteQuoteData,
      });
    } else {
      res.send({
        statusCode: 404,
        message: 'The quote could not be found',
      });
    }
  } catch (err) {
    logger.errorLog.error('quote delete fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};
