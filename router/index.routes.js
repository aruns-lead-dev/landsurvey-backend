const express = require('express');
const {
  login,
  forgotPassword,
  changePasswordFromForgot,
  DBEmpty,
  initializeQuickbookToken,
  quickbookCallback,
  identitycounter,
  ClientSyncQb,
  createClientSyncQb,
  readWebookInvoice,
  addLinesSyncDB,
  getTaxCodes,
  testApi,
} = require('../controller/index.controller');
const { verifyAccessToken } = require('../middleware/jwt');
const route = express.Router();
const baseRoute = require('./base.routes');
const userRoute = require('./user.routes');
const clientRoute = require('./client.routes');
const quoteRoute = require('./quote.routes');
const jobRoute = require('./job.routes');
const taskRoute = require('./task.routes');
const invoiceRoute = require('./invoice.routes');
const cityRoute = require('./city.routes');
const commentRoute = require('./comment.routes');
const stateRoute = require('./state.routes');
const taxRoute = require('./tax.routes');
const jobcategoryRoute = require('./jobcategory.routes');
const jobscopeRoute = require('./jobscope.routes');
const costiteamRoute = require('./costiteam.routes');
const vehicleRoute = require('./vehicle.routes');
const clienttypeRoute = require('./clienttype.routes');
const feeRoute = require('./fee.routes');
const officeRoute = require('./office.routes');
const ratesheetRoute = require('./ratesheet.routes');
const paymenttermRoute = require('./paymentterm.routes');
const jobstatusRoute = require('./jobstatus.routes');
const categoryRoute = require('./category.routes');
const dwrRoute = require('./dwr.routes');
const dwrReportsRoute = require('./reports.routes');
const scheduleRoute = require('./schedule.routes');
const holidayRoute = require('./holiday.routes');
const employeeLeaveRoute = require('./employeeLeave.routes');
const {
  exportClient,
  exportJob,
  exportRatesheet,
  exportTask,
  exportQuote,
} = require('../controller/export.controller');

//export PDF Routes
route.get('/export/client/:id', exportClient);
route.get('/export/quote/:id', exportQuote);
route.get('/export/job/:id', exportJob);
route.get('/export/rate-sheet/:id', exportRatesheet);
route.get('/export/task/:id', exportTask);

// auth
route.post('/change-password-forgot/:id', changePasswordFromForgot);
route.post('/login', login);
route.post('/forgot-password', forgotPassword);
route.get('/db-empty', DBEmpty);
route.use('/', baseRoute);

route.get('/initializeQuickbook', initializeQuickbookToken);
route.get('/quickbookCallback', quickbookCallback);
route.post('/invoice_webhook', readWebookInvoice);
route.get('/fetch_client_qb', ClientSyncQb);
route.get('/create_client_qb', createClientSyncQb);
route.get('/add_Lines_Sync_DB', addLinesSyncDB);
route.get('/get_tax_codes', getTaxCodes);

route.get('/testApi', testApi);

//masters
route.use('/city', verifyAccessToken, cityRoute);
route.use('/state', verifyAccessToken, stateRoute);
route.use('/tax', verifyAccessToken, taxRoute);
route.use('/fee', verifyAccessToken, feeRoute);
route.use('/office', verifyAccessToken, officeRoute);
route.use('/vehicle', verifyAccessToken, vehicleRoute);
route.use('/jobcategory', verifyAccessToken, jobcategoryRoute);
route.use('/jobscope', verifyAccessToken, jobscopeRoute);
route.use('/costiteam', verifyAccessToken, costiteamRoute);
route.use('/clienttype', verifyAccessToken, clienttypeRoute);
route.use('/paymentterm', verifyAccessToken, paymenttermRoute);
route.use('/jobstatus', verifyAccessToken, jobstatusRoute);
route.use('/category', verifyAccessToken, categoryRoute);

//modules
route.use('/user', verifyAccessToken, userRoute);
route.use('/client', verifyAccessToken, clientRoute);
route.use('/quote', verifyAccessToken, quoteRoute);
route.use('/job', verifyAccessToken, jobRoute);
route.use('/task', verifyAccessToken, taskRoute);
route.use('/ratesheet', verifyAccessToken, ratesheetRoute);
route.use('/dwr', verifyAccessToken, dwrRoute);
route.use('/dwrreports', verifyAccessToken, dwrReportsRoute);
route.use('/invoice', invoiceRoute);
route.use('/comment', verifyAccessToken, commentRoute);
route.use('/schedule', verifyAccessToken, scheduleRoute);
route.use('/holiday', verifyAccessToken, holidayRoute);
route.use('/employee-leave', verifyAccessToken, employeeLeaveRoute);

// Identifier counters

route.use('/identitycounter/:id', identitycounter);

module.exports = route;
