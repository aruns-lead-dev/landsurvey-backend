const logger = require('../middleware/logger');
const holyday = require('../models/holyday');

exports.readHolydays = async (req, res) => {
  try {
    const data = await holyday.find({ is_deleted: false }).sort({ date: 1 });
    res.send({ statusCode: 200, message: 'Holydays fetched successfully', data });
  } catch (err) {
    logger.errorLog.error('holyday fetch fail');
    res.send({ statusCode: 500, message: 'Holyday Fetch Fail', error: err });
  }
};

exports.createHolyday = async (req, res) => {
  try {
    const { date, description } = req.body;
    const newHolyday = await holyday.create({ date, description });
    logger.accessLog.info('holyday create success');
    res.send({ statusCode: 200, message: 'Holyday created successfully', data: newHolyday });
  } catch (err) {
    logger.errorLog.error('holyday create fail');
    res.send({ statusCode: 500, message: 'Holyday Create Fail', error: err });
  }
};

exports.updateHolyday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description } = req.body;
    const updated = await holyday.findByIdAndUpdate(id, { date, description }, { new: true });
    if (!updated) return res.send({ statusCode: 404, message: 'Holyday not found' });
    logger.accessLog.info('holyday update success');
    res.send({ statusCode: 200, message: 'Holyday updated successfully', data: updated });
  } catch (err) {
    logger.errorLog.error('holyday update fail');
    res.send({ statusCode: 500, message: 'Holyday Update Fail', error: err });
  }
};

exports.deleteHolyday = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await holyday.findByIdAndUpdate(id, { $set: { is_deleted: true } });
    if (!deleted) return res.send({ statusCode: 404, message: 'Holyday not found' });
    logger.accessLog.info('holyday delete success');
    res.send({ statusCode: 200, message: 'Holyday deleted successfully' });
  } catch (err) {
    logger.errorLog.error('holyday delete fail');
    res.send({ statusCode: 500, message: 'Holyday Delete Fail', error: err });
  }
};
