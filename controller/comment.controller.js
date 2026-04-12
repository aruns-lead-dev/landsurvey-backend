const { default: mongoose } = require('mongoose');
const logger = require('../middleware/logger');
const { COMMENT_PIPELINE } = require('../middleware/pipelines');
const comment = require('../models/comment');

exports.createComment = async (req, res) => {
  try {
    const { schedule_id, user_id, remark } = req.body;

    const newComment = await comment.create({
      schedule_id,
      user_id,
      remark,
    });

    logger.accessLog.info('comment create passed');

    return res.send({
      statusCode: 200,
      message: 'The comment has been created successfully',
      data: newComment,
    });
  } catch (err) {
    logger.errorLog.error('comment create fail');

    return res.send({
      statusCode: 500,
      message: 'Oops! Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.readCommentByFilter = async (req, res) => {
  try {
    const { schedule_id } = req.query;

    const matchQuery = { is_deleted: false };

    if (schedule_id) {
      if (!mongoose.Types.ObjectId.isValid(schedule_id)) {
        return res.send({
          statusCode: 400,
          message: 'Invalid Schedule ID',
          success: false,
        });
      }
      matchQuery.schedule_id = new mongoose.Types.ObjectId(schedule_id);
    }

    const comments = await comment.aggregate([
      { $match: matchQuery },
      ...COMMENT_PIPELINE,
      { $sort: { createdAt: -1 } },
    ]);

    logger.accessLog.info('comment fetch by filter success');
    res.send({
      statusCode: 200,
      message: 'Comments Fetched Successfully',
      data: comments,
    });
  } catch (err) {
    logger.errorLog.error('comment fetch by filter fail');
    res.send({ statusCode: 500, message: 'Comment Fetch Fail', error: err });
  }
};

exports.readCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.send({
        statusCode: 400,
        message: 'Invalid comment ID',
        success: false,
      });
    }

    const commentData = await comment.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id), is_deleted: false },
      },
      ...COMMENT_PIPELINE,
    ]);

    if (!commentData.length) {
      return res.send({
        statusCode: 404,
        message: 'Comment not found',
        success: false,
      });
    }

    logger.accessLog.info('comment fetch by id success');
    res.send({
      statusCode: 200,
      message: 'Comment Fetch Successfully',
      data: commentData[0],
    });
  } catch (err) {
    logger.errorLog.error('comment fetch by id fail');
    res.send({ statusCode: 500, message: 'Comment Fetch Fail', error: err });
  }
};

exports.readAllComment = async (req, res) => {
  try {
    const userData = await comment.aggregate([
      {
        $match: { is_deleted: false },
      },
      ...COMMENT_PIPELINE,
      { $sort: { createdAt: -1 } },
    ]);
    logger.accessLog.info('comment fetch success');
    res.send({
      statusCode: 200,
      message: 'Comment Fetch Successfully',
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error('comment fetch fail');
    res.send({ statusCode: 500, message: 'Comment Fetch Fail', error: err });
  }
};
