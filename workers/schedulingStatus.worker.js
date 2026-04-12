const scheduling = require('../models/scheduling');

exports.schedulingStatusWorker = async (job) => {
  const result = await scheduling.updateMany(
    {
      status: { $in: ['open', 'assigned'] },
      is_deleted: false,
      planned_date: { $lt: new Date() },
    },
    { $set: { status: 'completed' } }
  );
  console.log(
    `[schedulingStatusWorker] Updated ${result.modifiedCount} scheduling document(s) to 'completed'`
  );
  return { modifiedCount: result.modifiedCount };
};
