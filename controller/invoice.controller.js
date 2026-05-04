const { mongoose } = require('mongoose');
const logger = require('../middleware/logger');
const Jimp = require('jimp');
const {
  TASK_PIPELINE,
  INVOICE_PIPELINE,
  TOKEN_PIPELINE,
  QUOTE_TASK_PIPELINE,
} = require('../middleware/pipelines');
const task = require('../models/task');
const { axios } = require('axios');
const OAuthClient = require('intuit-oauth');
const invoice = require('../models/invoice');
const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const path = require('path');
const quickbook = require('../models/quickbook');
const fetch = require('node-fetch');
var crypto = require('crypto');
const client = require('../models/client');
const QuickBooksHelper = require('../utils/quickbooksHelper');
const invoiceitems = require('../models/invoiceitems');
const taxcodes = require('../models/taxcodes');

const isProduction = process.env.QB_IS_PRODUCTION === '1';

// Load environment variables based on the environment
const QB_CONFIG = {
  clientId: isProduction
    ? process.env.QB_CLIENTID_PRODUCTION
    : process.env.QB_CLIENTID,
  clientSecret: isProduction
    ? process.env.QB_CLIENTSECRET_PRODUCTION
    : process.env.QB_CLIENTSECRET,
  environment: isProduction
    ? process.env.QB_ENVIRONMENT_PRODUCTION
    : process.env.QB_ENVIRONMENT,
  redirectUri: isProduction
    ? process.env.QB_REDIRECTURI_PRODUCTION
    : process.env.QB_REDIRECTURI,
  companyId: isProduction
    ? process.env.QB_COMPANYID_PRODUCTION
    : process.env.QB_COMPANYID,
  baseUrl: isProduction
    ? process.env.QB_BASE_URL_PRODUCTION
    : process.env.QB_BASE_URL,
};

exports.readInvoice = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    var user_id = req.query.user_id;

    var myMatch = {
      is_deleted: false,
      qb_invoice_id: { $ne: null },
    };

    if (page === undefined) {
      page = '1';
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    if (user_id && user_id !== 'All_Manager') {
      myMatch.project_managers = mongoose.Types.ObjectId(user_id);
    }
    const data = page * per_page - per_page;
    if (search === '') {
      const totalDataCount = await invoice.aggregate([
        ...INVOICE_PIPELINE,
        {
          $match: myMatch,
        },
        { $count: 'total' },
      ]);

      var count = totalDataCount.length > 0 ? totalDataCount[0].total : 0;

      var allTasks = await invoice.aggregate([
        ...INVOICE_PIPELINE,
        {
          $match: myMatch,
        },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    } else {
      const totalDataCount = await invoice.aggregate([
        ...INVOICE_PIPELINE, // Existing pipeline
        {
          $match: {
            ...myMatch,
            $or: [{ number_str: { $regex: search, $options: 'i' } }], // Case-insensitive search
          },
        },
        {
          $count: 'total',
        },
      ]);

      var count = totalDataCount.length > 0 ? totalDataCount[0].total : 0;

      var allTasks = await invoice.aggregate([
        ...INVOICE_PIPELINE,
        {
          $match: {
            $and: [
              myMatch,
              {
                $or: [
                  { number_str: { $regex: search } },
                  { doc_number: { $regex: search } },
                  {
                    'client_id.company_name': { $regex: search, $options: 'i' },
                  },
                  {
                    task_details: {
                      $elemMatch: {
                        number_str: { $regex: search, $options: 'i' },
                      },
                    },
                  },
                  {
                    'job_details.number_str': { $regex: search, $options: 'i' },
                  },
                ],
              },
            ],
          },
        },
        { $sort: { createdAt: sortOrder } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
      ]);
    }

    logger.accessLog.info('task fetch success');
    res.send({
      statusCode: 200,
      message: 'The invoice has been fetched successfully',
      total: count,
      data: allTasks,
    });
  } catch (err) {
    logger.errorLog.error('invoice fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the invoice',
      error: err,
    });
  }
};

exports.invoicePaymentReceived = async (req, res) => {
  const invoice_id = req.query.id;

  try {
    const updatedInvoice = await invoice.findByIdAndUpdate(invoice_id, {
      is_paid: 1,
    });

    res.status(200).json({
      message: 'Invoice payment status updated successfully',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the invoice' });
  }
};

exports.readTaskByClientId = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var client_id = req.params.client_id;
    var user_id = req.query.user_id;
    var task_id = req.query.taskId;
    if (page === undefined) {
      page = '1';
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    var myMatch = {
      is_deleted: false,
      select_client_id: mongoose.Types.ObjectId(client_id),
      is_completed: 1,
      is_invoice_generated: false,
    };
    var mySelectdMatch = { is_completed: 1, is_deleted: false };
    let selectedTaskWithoutQoute = [];

    if (user_id) {
      myMatch.project_manager = mongoose.Types.ObjectId(user_id);
      mySelectdMatch.project_manager = mongoose.Types.ObjectId(user_id);
    }
    const data = page * per_page - per_page;
    var allTasksWithoutQoute = await task.aggregate([
      {
        $match: myMatch,
      },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(data) },
      { $limit: parseInt(per_page) },
      ...TASK_PIPELINE,
    ]);
    if (task_id && task_id !== 'undefined') {
      mySelectdMatch._id = mongoose.Types.ObjectId(task_id);
      selectedTaskWithoutQoute = await task.aggregate([
        {
          $match: mySelectdMatch,
        },
        { $sort: { createdAt: -1 } },
        { $skip: parseInt(data) },
        { $limit: parseInt(per_page) },
        ...TASK_PIPELINE,
      ]);
    }
    var allTasks = [...allTasksWithoutQoute, ...selectedTaskWithoutQoute];

    logger.accessLog.info('client task fetch success');
    res.send({
      statusCode: 200,
      message: 'The client task has been fetched successfully',
      data: allTasks,
    });
  } catch (err) {
    logger.errorLog.error('client task fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the client task',
      error: err,
    });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const {
      selectClient,
      selectClient_id,
      taskIds,
      subTotal,
      totalHours,
      selectClient_referenceno,
      labourCosts,
      CustomerMemo,
      taxCodeRef,
    } = req.body;
    const todayDate = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-CA').format(todayDate);
    const LineItems = labourCosts?.map((i) => {
      const labCost = {
        Description: i.description ? i.description : '',
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: i.dwr_hours,
          UnitPrice: i.unit_cost,
          ItemRef: {
            name: i.cost_item,
            value: i.value,
          },
          ServiceDate: formattedDate,
        },
        Amount: i.billable_cost,
      };
      if (i.sales_tax && i.sales_tax_value) {
        labCost.SalesItemLineDetail.TaxCodeRef = {
          name: i.sales_tax,
          value: i.sales_tax_value,
        };
      }
      return labCost;
    });

    // Body sample from API explorer examples
    const body = {
      Line: LineItems,
      CustomerRef: {
        value: selectClient_referenceno,
      },
      CustomerMemo: {
        value: CustomerMemo,
      },
    };

    if (CustomerMemo) {
      body.CustomerMemo = {
        value: CustomerMemo,
      };
    }

    const hasTax = LineItems.some(
      (item) => item.SalesItemLineDetail.TaxCodeRef.value === 'TAX',
    );
    if (hasTax) {
      body.TxnTaxDetail = {
        TxnTaxCodeRef: {
          value: taxCodeRef || '4',
        },
      };
    }
    const apiUrl = `${QB_CONFIG.baseUrl}/invoice`;
    const response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      body,
    );
    if (
      response.Fault &&
      response.Fault.Error &&
      response.Fault.Error.length > 0
    ) {
      return res.send({
        statusCode: 500,
        message:
          `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
          'Oops Something went wrong. Please contact the administrator',
      });
    }

    const newInvoice = await invoice.create({
      client_id: selectClient_id,
      client_ref_id: selectClient_referenceno,
      task_ids: taskIds,
      total_cost: response.Invoice.TotalAmt,
      total_hours: totalHours,
      sub_total: subTotal,
      qb_invoice_id: response.Invoice.Id,
      doc_number: response?.Invoice.DocNumber,
      lines: response?.Invoice.Line,
      SyncToken: response?.Invoice.SyncToken,
      TxnDate: response?.Invoice?.TxnDate,
      qb_response: response?.Invoice,
    });
    await invoice.findByIdAndUpdate(newInvoice._id, {
      $set: {
        number_str: newInvoice.number.toString().padStart(6, '0'),
      },
    });

    newInvoice.save();
    logger.accessLog.info('Invoice create success');

    // update task as invoice generated
    const isUpdate = await task.findByIdAndUpdate(taskIds, {
      is_invoice_generated: 1,
      invoice_id: newInvoice._id,
    });

    res.send({
      statusCode: 200,
      message: 'The invoice has been generated successfully',
      invoice: newInvoice,
    });
  } catch (err) {
    logger.errorLog.error('invoice create fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateGeneratedInvoice = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const {
      selectClient,
      selectClient_id,
      taskIds,
      subTotal,
      totalHours,
      selectClient_referenceno,
      labourCosts,
      SyncToken,
      qb_invoice_id,
      CustomerMemo,
      taxCodeRef,
    } = req.body;

    const LineItems = labourCosts?.map((i) => {
      const labCost = {
        Description: i.description ? i.description : '',
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: i.dwr_hours,
          UnitPrice: i.unit_cost,
          ItemRef: {
            name: i.cost_item,
            value: i.value,
          },
          ServiceDate: i.service_date,
        },
        Amount: i.billable_cost,
      };
      if (i.sales_tax && i.sales_tax_value) {
        labCost.SalesItemLineDetail.TaxCodeRef = {
          name: i.sales_tax,
          value: i.sales_tax_value,
        };
      }
      return labCost;
    });

    // Body sample from API explorer examples
    const body = {
      Id: qb_invoice_id,
      SyncToken: SyncToken,
      Line: LineItems,
      CustomerRef: {
        value: selectClient_referenceno,
      },
      CustomerMemo: {
        value: CustomerMemo,
      },
    };
    if (CustomerMemo) {
      body.CustomerMemo = {
        value: CustomerMemo,
      };
    }
    const hasTax = LineItems.some(
      (item) => item.SalesItemLineDetail.TaxCodeRef.value === '3',
    );

    if (hasTax) {
      body.TxnTaxDetail = {
        TxnTaxCodeRef: {
          value: taxCodeRef || '4',
        },
      };
    }

    const apiUrl = `${QB_CONFIG.baseUrl}/invoice?minorversion=69`;
    const response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      body,
    );
    if (
      response.Fault &&
      response.Fault.Error &&
      response.Fault.Error.length > 0
    ) {
      return res.send({
        statusCode: 500,
        message:
          `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
          'Oops Something went wrong. Please contact the administrator',
      });
    }
    // update task as invoice generated
    const invoiceData = await invoice.findById(
      mongoose.Types.ObjectId(invoice_id),
    );

    const newInvoice = await invoice.findByIdAndUpdate(
      mongoose.Types.ObjectId(invoice_id),
      {
        $set: {
          client_id: selectClient_id,
          client_ref_id: selectClient_referenceno,
          task_ids: taskIds,
          total_cost: response.Invoice.TotalAmt,
          sub_total: subTotal,
          total_hours: totalHours,
          qb_invoice_id: response.Invoice.Id,
          doc_number: response?.Invoice.DocNumber,
          lines: response?.Invoice.Line,
          SyncToken: response?.Invoice.SyncToken,
          TxnDate: response?.Invoice?.TxnDate,
          qb_response: response?.Invoice,
        },
      },
    );

    newInvoice.save();
    logger.accessLog.info('Invoice Updated success');

    if (!invoiceData.task_ids.equals(new mongoose.Types.ObjectId(taskIds))) {
      await task.findOneAndUpdate(
        { _id: invoiceData.task_ids },
        {
          is_invoice_generated: 0,
          invoice_id: null,
        },
      );

      const isUpdate = await task.findByIdAndUpdate(taskIds, {
        is_invoice_generated: 1,
        invoice_id: newInvoice._id,
      });
    }

    res.send({
      statusCode: 200,
      message: 'The invoice has been Updated successfully',
      invoice: newInvoice,
    });
  } catch (err) {
    logger.errorLog.error('invoice Updated fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.downloadInvoice = async (req, res) => {
  try {
    const { qb_invoice_id } = req.params;
    const fileName = qb_invoice_id + '.pdf';
    const destination = path.resolve('./public/invoice_pdf/', fileName);
    var resToken = await QuickBooksHelper.getQuickBooksToken();
    const url = `${QB_CONFIG.baseUrl}/invoice/${qb_invoice_id}/pdf`;
    await fetch(url, {
      method: 'GET',
      withCredentials: true,
      credentials: 'include',
      headers: { Authorization: 'Bearer ' + resToken.access_token },
    })
      .then(async function (response) {
        const fileStream = fs.createWriteStream(destination, {
          flags: 'w',
        });
        await new Promise((resolve, reject) => {
          response.body.pipe(fileStream);
          response.body.on('error', reject);
          fileStream.on('finish', resolve);
        });
        // }
        var file = fs.createReadStream('./public/invoice_pdf/' + fileName);
        var stat = fs.statSync('./public/invoice_pdf/' + fileName);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=quote.pdf');
        file.pipe(res);
      })
      .catch((e) => {
        console.error('The error message is :' + e.originalMessage);
        console.error(e.intuit_tid);
        res.send({
          statusCode: 500,
          message: 'Something went wrong while downloading invoice',
          error: e.originalMessage,
        });
      });
    // }
  } catch (err) {
    logger.errorLog.error('task fetch fail');
    res.send({ statusCode: 500, message: 'task fetch fail', error: err });
  }
};

async function generateLineItems(taskIdsArr) {
  var tasks = await task.aggregate([
    {
      $match: {
        $and: [{ _id: { $in: taskIdsArr } }],
      },
    },
    ...TASK_PIPELINE,
  ]);

  var LineItems = [];
  const taskArr = tasks.map((item) => {
    item?.billing_line_items?.labour_item?.labour_cost_items?.map((i) => {
      const labCost = {
        Description: i.costItem,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          Qty: i.estimated_hour,
          UnitPrice: i.unitCost,
        },
        Amount: i.estimated_hour * i.unitCost,
      };
      LineItems.push(labCost);
    });
  });

  return LineItems;
}

exports.getInvoiceItem = async (req, res) => {
  try {
    // Fetch invoice items from MongoDB
    const ITEM_LIST = await invoiceitems.aggregate([
      { $match: { is_deleted: false } },
    ]);

    // // API URL for QuickBooks queries
    const apiUrl = `${QB_CONFIG.baseUrl}/query?minorversion=72`;

    // // Fetch tax codes and tax rates in parallel to improve performance
    const [taxCodesResponse, taxRatesResponse] = await Promise.all([
      QuickBooksHelper.makeQuickBooksApiPostCall(
        apiUrl,
        '',
        'text',
        'select * from taxcode startposition 1 maxresults 50',
      ),
      QuickBooksHelper.makeQuickBooksApiPostCall(
        apiUrl,
        '',
        'text',
        'select * from taxrate startposition 1 maxresults 50',
      ),
    ]);

    // // Extract data from responses
    const TAX_CODES_LIST = taxCodesResponse?.QueryResponse?.TaxCode || [];
    const TAX_RATES_LIST = taxRatesResponse?.QueryResponse?.TaxRate || [];

    // Map tax rates to tax codes
    TAX_CODES_LIST.forEach((taxObj) => {
      let sum = 0;
      taxObj?.SalesTaxRateList?.TaxRateDetail.forEach((detail, index) => {
        const matchingRate = TAX_RATES_LIST.find(
          (rate) => rate.Id === detail.TaxRateRef?.value,
        );
        if (matchingRate) {
          sum = sum + matchingRate.RateValue;
          taxObj.SalesTaxRateList.TaxRateDetail[index].RateValue =
            matchingRate.RateValue;
        }
      });
      taxObj.TaxRate = sum;
    });

    // Send success response
    res.status(200).json({
      statusCode: 200,
      message: 'Invoice items fetched successfully',
      ITEM_LIST,
      TAX_CODES_LIST,
    });
  } catch (err) {
    console.error('Invoice fetch failed:', err);

    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch the invoice',
      error: err.message,
    });
  }
};

exports.readInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoiceData = await invoice.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
        },
      },
      ...INVOICE_PIPELINE,
    ]);
    logger.accessLog.info('invoice fetch success');
    res.send({
      statusCode: 200,
      message: 'The invoice has been fetched successfully',
      data: invoiceData[0],
    });
  } catch (err) {
    logger.errorLog.error('invoice fetch fail');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the invoice',
    });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const { Id, qb_invoice_id, SyncToken } = req.body;

    let body = {
      Id: qb_invoice_id,
      SyncToken: SyncToken,
    };
    const apiUrl = `${QB_CONFIG.baseUrl}/invoice?operation=delete`;
    const response = await QuickBooksHelper.makeQuickBooksApiPostCall(
      apiUrl,
      body,
    );
    if (
      response.Fault &&
      response.Fault.Error &&
      response.Fault.Error.length > 0
    ) {
      return res.send({
        statusCode: 500,
        message:
          `${response.Fault.Error[0].Message} ${response.Fault.Error[0].Detail}` ||
          'Oops Something went wrong. Please contact the administrator',
      });
    }

    const deleteInvoice = await invoice.findByIdAndUpdate(Id, {
      is_deleted: true,
    });

    const isUpdate = await task.findByIdAndUpdate(
      { _id: deleteInvoice.task_ids }, // Find all matching task IDs
      {
        is_invoice_generated: 0,
        invoice_id: null,
      },
    );

    logger.accessLog.info('Invoice delete successfully');
    res.send({
      statusCode: 200,
      message: 'The Invoice has been deleted successfully',
      Invoice: deleteInvoice,
    });
  } catch (err) {
    logger.errorLog.error('Invoice delete fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};
