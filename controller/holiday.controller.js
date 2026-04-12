const logger = require('../middleware/logger');
const holiday = require('../models/holiday');

exports.readHolidays = async (req, res) => {
  try {
    const data = await holiday.find({ is_deleted: false }).sort({ date: 1 });
    res.send({ statusCode: 200, message: 'Holidays fetched successfully', data });
  } catch (err) {
    logger.errorLog.error('holiday fetch fail');
    res.send({ statusCode: 500, message: 'Holiday Fetch Fail', error: err });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { date, description } = req.body;
    const newHoliday = await holiday.create({ date, description });
    logger.accessLog.info('holiday create success');
    res.send({ statusCode: 200, message: 'Holiday created successfully', data: newHoliday });
  } catch (err) {
    logger.errorLog.error('holiday create fail');
    res.send({ statusCode: 500, message: 'Holiday Create Fail', error: err });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, description } = req.body;
    const updated = await holiday.findByIdAndUpdate(id, { date, description }, { new: true });
    if (!updated) return res.send({ statusCode: 404, message: 'Holiday not found' });
    logger.accessLog.info('holiday update success');
    res.send({ statusCode: 200, message: 'Holiday updated successfully', data: updated });
  } catch (err) {
    logger.errorLog.error('holiday update fail');
    res.send({ statusCode: 500, message: 'Holiday Update Fail', error: err });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await holiday.findByIdAndUpdate(id, { $set: { is_deleted: true } });
    if (!deleted) return res.send({ statusCode: 404, message: 'Holiday not found' });
    logger.accessLog.info('holiday delete success');
    res.send({ statusCode: 200, message: 'Holiday deleted successfully' });
  } catch (err) {
    logger.errorLog.error('holiday delete fail');
    res.send({ statusCode: 500, message: 'Holiday Delete Fail', error: err });
  }
};
