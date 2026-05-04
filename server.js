const express = require('express');
const app = express();
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();
const port = Number(process.env.PORT) || 3007;
var bodyParser = require('body-parser');
const dbconnection = require('./config/db');
const {
  ExpressAdapter,
  createBullBoard,
  BullMQAdapter,
} = require('@bull-board/express');
const indexRouter = require('./router/index.routes');
const bullRouter = require('./router/bull.routes');
const { createQueueMQ, setupBullMQProcessor } = require('./config/bullMQ');
const { forgotPasswordQueue } = require('./services/forgotPassword.service');
const temporaryStamp = require('temporary-stamp');
const { createAccountQueue } = require('./services/createAccount.service');
const { schedulingStatusQueue } = require('./services/schedulingStatus.service');
const key = crypto.randomBytes(32);
const cipher = 'aes-256-ctr';
const hash = 'sha512';
const iv = crypto.randomBytes(16);
exports.stamp = new temporaryStamp(key, cipher, hash, iv);

(async () => {
  await setupBullMQProcessor(forgotPasswordQueue.name);
  await setupBullMQProcessor(createAccountQueue.name);
  await setupBullMQProcessor(schedulingStatusQueue.name);

  await schedulingStatusQueue.add(
    'Scheduling Status Job',
    {},
    {
      repeat: { cron: '1 12 * * *' },
      removeOnComplete: { count: 100 },
      removeOnFail: false,
    },
  );
})();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/dashboard');

createBullBoard({
  queues: [
    new BullMQAdapter(forgotPasswordQueue),
    new BullMQAdapter(schedulingStatusQueue),
    new BullMQAdapter(createAccountQueue),
  ],
  serverAdapter: serverAdapter,
});

app.use('/dashboard', serverAdapter.getRouter());
app.use(cors());
app.set('view engine', 'ejs');
app.use(bodyParser.json({ limit: '50mb' }));
app.use(
  bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000,
  }),
);
dbconnection();
app.use('/', bullRouter);

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use('/api', indexRouter);

app.listen(port, () => {
  console.log(`Server Rinnung on http://localhost:${port}`);
});
