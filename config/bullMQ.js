const { Worker, Queue } = require('bullmq');
const { createAccountWorker } = require('../workers/createAccount.worker');
const { forgotPasswordWorker } = require('../workers/forgotPassword.worker');
const { schedulingStatusWorker } = require('../workers/schedulingStatus.worker');

require('dotenv').config();

exports.redisConnection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB),
};

exports.createQueueMQ = (name) =>
  new Queue(name, { connection: this.redisConnection });

exports.setupBullMQProcessor = async (queueName) => {
  await new Queue(queueName, { connection: this.redisConnection });
  await new Worker(
    queueName,
    async (job) => {
      switch (queueName) {
        case 'Forgot Password':
          forgotPasswordWorker(job);
          break;

        case 'Create Account':
          createAccountWorker(job);
          break;

        case 'Scheduling Status':
          await schedulingStatusWorker(job);
          break;

        default:
          break;
      }
    },
    { connection: this.redisConnection },
  );
};
