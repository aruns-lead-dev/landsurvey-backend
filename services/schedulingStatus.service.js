const { createQueueMQ } = require('../config/bullMQ');

exports.schedulingStatusQueue = createQueueMQ('Scheduling Status');
