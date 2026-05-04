const logger = require('../middleware/logger');
const { default: mongoose } = require('mongoose');
const dwr = require('../models/dwr');
const Task = require('../models/task');
const Jimp = require('jimp');
const { DWR_PIPELINE, TASK_PIPELINE } = require('../middleware/pipelines');
const { default: axios } = require('axios');
const { startOfDay, endOfDay } = require('date-fns');
const { v4: uuidv4 } = require('uuid');

exports.readDwr = async (req, res) => {
  try {
    var page = req?.query?.page ?? 1;
    var per_page = req?.query?.per_page ?? 10;
    var search = req.query.search;
    var sortField =
      req.query.sortField === 'undefined' ? 'status' : req.query.sortField;
    var sortOrder =
      req.query.sortOrder === 'asc' || req.query.sortOrder === 'undefined'
        ? 1
        : -1;
    var user_id = req.query.user_id;
    var staffApprove = req.query.staffApprove;
    let matchStage = { is_deleted: false };
    var start_date = req.query.startDate ?? null;
    var end_date = req.query.endDate ?? null;
    if (user_id) {
      if (staffApprove) {
        matchStage.$and = [
          { user_id: { $ne: mongoose.Types.ObjectId(user_id) } },
          { project_manager: mongoose.Types.ObjectId(user_id) },
        ];
      } else {
        matchStage.user_id = mongoose.Types.ObjectId(user_id);
      }
    }
    if (page === undefined) {
      page = '1';
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    if (req.query.endDate && req.query.startDate) {
      const start = startOfDay(new Date(start_date));
      const end = endOfDay(new Date(end_date));
      matchStage.task_date = {
        $gte: start,
        $lt: end,
      };
    }
    const data = page * per_page - per_page;
    if (search === '') {
      // Handle sorting and pagination
      var alldwrs;
      if (sortField === 'user_firstname') {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          {
            $addFields: {
              full_name: {
                $concat: ['$user_firstname', ' ', '$user_lastname'],
              },
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by concatenated full_name
        ]);
      } else if (sortField === 'project_manager') {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          {
            $addFields: {
              full_name: {
                $concat: [
                  '$project_manager_detail.first_name',
                  ' ',
                  '$project_manager_detail.last_name',
                ],
              },
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by user_firstname
        ]);
      } else if (sortField === 'status') {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          { $sort: { status: sortOrder, createdAt: -1 } },
        ]);
      } else {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          { $match: matchStage },
          { $sort: { createdAt: sortOrder } },
        ]);
      }
    } else {
      if (sortField === 'user_firstname') {
        var alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              user_full_name: {
                $concat: ['$user_firstname', ' ', '$user_lastname'],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: 'i' } },
                    { dwr_number: { $regex: search, $options: 'i' } },
                    { job_number: { $regex: search, $options: 'i' } },
                    {
                      'taskdata.number_str': { $regex: search, $options: 'i' },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { user_firstname: sortOrder, createdAt: -1 } },
        ]);
      } else if (sortField === 'project_manager') {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              full_name: {
                $concat: [
                  '$project_manager_detail.first_name',
                  ' ',
                  '$project_manager_detail.last_name',
                ],
              },
            },
          },
          {
            $addFields: {
              user_full_name: {
                $concat: ['$user_firstname', ' ', '$user_lastname'],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: 'i' } },
                    { dwr_number: { $regex: search, $options: 'i' } },
                    { job_number: { $regex: search, $options: 'i' } },
                    {
                      'taskdata.number_str': { $regex: search, $options: 'i' },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { full_name: sortOrder, createdAt: -1 } }, // Sort by user_firstname
        ]);
      } else if (sortField === 'status') {
        alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: 'i' } },
                    { dwr_number: { $regex: search, $options: 'i' } },
                    { job_number: { $regex: search, $options: 'i' } },
                    {
                      'taskdata.number_str': { $regex: search, $options: 'i' },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { status: sortOrder, createdAt: -1 } },
        ]);
      } else {
        var alldwrs = await dwr.aggregate([
          ...DWR_PIPELINE,
          {
            $addFields: {
              user_full_name: {
                $concat: ['$user_firstname', ' ', '$user_lastname'],
              },
            },
          },
          {
            $match: {
              $and: [
                matchStage,
                {
                  $or: [
                    { user_full_name: { $regex: search, $options: 'i' } },
                    { dwr_number: { $regex: search, $options: 'i' } },
                    { job_number: { $regex: search, $options: 'i' } },
                    {
                      'taskdata.number_str': { $regex: search, $options: 'i' },
                    },
                  ],
                },
              ],
            },
          },
          { $sort: { createdAt: sortOrder } },
        ]);
      }
    }
    logger.accessLog.info('dwr fetch successfully');
    res.send({
      statusCode: 200,
      message: 'The DWR has been fetched successfully',
      total: 0,
      data: alldwrs,
    });
  } catch (err) {
    logger.errorLog.error('Failed to fetch the DWR.');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the DWR',
      error: err,
    });
  }
};

exports.readDwrById = async (req, res) => {
  try {
    const { id } = req.params;
    const dwrData = await dwr.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      ...DWR_PIPELINE,
    ]);
    logger.accessLog.info('dwr fetch success');
    res.send({
      statusCode: 200,
      message: 'The DWR has been fetched successfully',
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error('Failed to fetch the DWR.');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the DWR',
      error: err,
    });
  }
};

exports.readAllDwr = async (req, res) => {
  try {
    const dwrData = await dwr.aggregate([
      {
        $match: { is_deleted: false },
      },
      ...DWR_PIPELINE,
    ]);
    dwrData.map(async (item) => {
      const updatedwrData = await dwr.findByIdAndUpdate(item._id, {
        task_date: item.task_date,
      });
    });
    logger.accessLog.info('dwr fetch success');
    res.send({
      statusCode: 200,
      message: 'The DWR has been fetched successfully',
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error('Failed to fetch the DWR.');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the DWR',
      error: err,
    });
  }
};

exports.createDwr = async (req, res) => {
  try {
    const {
      task_id,
      user_id,
      task_name,
      task_date,
      labourCosts,
      equipment,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_managers_array,
    } = req.body;

    async function saveBase64Image(base64Str, folderPath, fileSuffix) {
      if (!base64Str) return '';

      const cleanBase64 = base64Str.slice(22);
      const buffer = Buffer.from(cleanBase64, 'base64');

      const fileName = `${Date.now()}_${fileSuffix}.png`;
      const filePath = `${__dirname}/../public/${folderPath}/${fileName}`;

      return new Promise((resolve) => {
        Jimp.read(buffer, (error, img) => {
          if (error) {
            console.log('Image save error:', error);
            return resolve('');
          }
          img.quality(5).write(filePath, () => resolve(fileName));
        });
      });
    }

    const savedClientApproved = await saveBase64Image(
      client_approved_DWR,
      'dwr/attachments',
      `${task_name}_dwr`,
    );
    const savedRepSign = await saveBase64Image(
      representative_sign,
      'dwr/signature',
      `represent_${task_name}_dwr`,
    );
    const savedClientRepSign = await saveBase64Image(
      client_representative_sign,
      'dwr/signature',
      `client_represent_${task_name}_dwr`,
    );

    const taskDoc = await Task.findById(task_id);
    if (!taskDoc) {
      return res.send({
        statusCode: 404,
        massage: 'Task not found',
      });
    }

    const labourItemObj =
      taskDoc.billing_line_items?.labour_item?.labour_cost_items || [];

    const previousDwrs = await dwr.find({ task_id });

    function getNextUuidForCostItem(costItemName) {
      if (!costItemName) return uuidv4();

      const sameCostItems = labourItemObj.filter(
        (i) => i.costItem?.trim() === costItemName.trim(),
      );

      const usedUuids = new Set();
      previousDwrs.forEach((d) => {
        (d.billing_line_items?.labourCosts || []).forEach((lc) => {
          if (lc.costitem === costItemName && lc.uuid) {
            usedUuids.add(lc.uuid);
          }
        });
      });

      if (sameCostItems.length === 0) {
        return uuidv4();
      }

      const reusable = sameCostItems.find(
        (i) =>
          i.trip === false ||
          i.trip === 'false' ||
          i.trip === undefined ||
          i.trip === null,
      );
      if (reusable) {
        return reusable.uuid;
      }

      for (const item of sameCostItems) {
        if (
          (item.trip === true || item.trip === 'true') &&
          !usedUuids.has(item.uuid)
        ) {
          return item.uuid;
        }
      }

      return uuidv4();
    }

    const updatedLabourCosts = labourCosts.map((lc) => ({
      ...lc,
      uuid: getNextUuidForCostItem(lc.costitem),
    }));

    const promises = updatedLabourCosts.map(async (item) => {
      const newdwr = await dwr.create({
        task_id,
        task_date,
        user_id: item.employee || user_id,
        task_hour: item.hours,
        submit_status,
        client_representative,
        billing_line_items: {
          labourCosts: [item],
          equipment: equipment || [],
        },
        submit_date: new Date().toISOString().split('T')[0],
        remark,
        project_managers_array,
        client_approved_DWR: savedClientApproved,
        representative_sign: savedRepSign,
        client_representative_sign: savedClientRepSign,
      });

      await dwr.findByIdAndUpdate(newdwr._id, {
        $set: { dwr_number: newdwr.number.toString().padStart(6, '0') },
      });

      return newdwr;
    });

    const createdDwrs = await Promise.all(promises);

    let updatesDone = false;
    updatedLabourCosts.forEach((lc) => {
      labourItemObj.forEach((taskItem) => {
        if (
          taskItem.uuid === lc.uuid &&
          taskItem.trip === true &&
          !taskItem.isDwrGenerated
        ) {
          updatesDone = true;
        }
      });
    });

    if (updatesDone) {
      taskDoc.markModified('billing_line_items.labour_item.labour_cost_items');
      await taskDoc.save();
    }

    return res.send({
      statusCode: 200,
      message: 'The DWR has been created successfully',
      dwr: createdDwrs,
    });
  } catch (err) {
    console.log(err);
    return res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateDwr = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_id,
      task_name,
      task_date,
      task_hour,
      labourCosts,
      user_id,
      equipment,
      project_manager_id,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_managers_array,
    } = req.body;

    if (client_approved_DWR !== '') {
      if (client_approved_DWR.includes('dwr')) {
        req.body.client_approved_DWR = req.body.client_approved_DWR;
      } else {
        const data = client_approved_DWR?.slice(22);
        const buffer = Buffer.from(data, 'base64');
        req.body.client_approved_DWR = `${Date.now()}_${task_name}_dwr.png`;
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
                  `/../public/dwr/attachments/${req.body.client_approved_DWR}`,
              );
          }
        });
      }
    } else {
      req.body.client_approved_DWR = '';
    }

    if (representative_sign !== '') {
      if (representative_sign.includes('dwr')) {
        req.body.representative_sign = req.body?.representative_sign;
      } else {
        const representativedata = representative_sign?.slice(22);
        const representbuffer = Buffer.from(representativedata, 'base64');
        req.body.representative_sign = `${Date.now()}_represent_${task_name}_dwr.png`;
        Jimp.read(representbuffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`,
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                  `/../public/dwr/signature/${req.body.representative_sign}`,
              );
          }
        });
      }
    } else {
      req.body.representative_sign = '';
    }

    if (client_representative_sign !== '') {
      if (client_representative_sign.includes('dwr')) {
        req.body.client_representative_sign =
          req.body?.client_representative_sign;
      } else {
        const client_representativedata = client_representative_sign?.slice(22);
        const client_represent_buffer = Buffer.from(
          client_representativedata,
          'base64',
        );
        req.body.client_representative_sign = `${Date.now()}_clientrepresents_${task_name}_dwr.png`;
        Jimp.read(client_represent_buffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`,
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                  `/../public/dwr/signature/${req.body.client_representative_sign}`,
              );
          }
        });
      }
    } else {
      req.body.client_representative_sign = '';
    }

    const updatedwrData = await dwr.findByIdAndUpdate(id, {
      task_id: task_id,
      user_id: user_id,
      task_date: task_date,
      task_hour: task_hour,
      submit_status: submit_status,
      client_representative: client_representative,
      billing_line_items: {
        labourCosts: labourCosts,
        equipment: equipment,
      },
      project_manager_id: project_manager_id,
      project_managers_array: project_managers_array,
      remark: remark,
      client_approved_DWR: req.body.client_approved_DWR,
      representative_sign: req.body?.representative_sign,
      client_representative_sign: req.body.client_representative_sign,
    });
    if (updatedwrData) {
      await updatedwrData.save();
      logger.accessLog.info('dwr Update Successfully');
      res.send({
        statusCode: 200,
        massage: 'The DWR has been updated successfully',
        client: updatedwrData,
      });
    }
  } catch (err) {
    logger.errorLog.error('dwr update fail');
    res.send({
      statusCode: 500,
      massage: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateDwrAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_id,
      task_name,
      task_date,
      task_hour,
      labourCosts,
      user_id,
      equipment,
      project_manager_id,
      submit_status,
      remark,
      client_approved_DWR,
      representative_sign,
      client_representative_sign,
      client_representative,
      project_managers_array,
    } = req.body;
    if (client_approved_DWR !== '') {
      if (client_approved_DWR.includes('dwr')) {
        req.body.client_approved_DWR = req.body.client_approved_DWR;
      } else {
        const data = client_approved_DWR?.slice(22);
        const buffer = Buffer.from(data, 'base64');
        req.body.client_approved_DWR = `${Date.now()}_${task_name}_dwr.png`;
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
                  `/../public/dwr/attachments/${req.body.client_approved_DWR}`,
              );
          }
        });
      }
    } else {
      req.body.client_approved_DWR = '';
    }

    if (representative_sign !== '') {
      if (representative_sign.includes('dwr')) {
        req.body.representative_sign = req.body?.representative_sign;
      } else {
        const representativedata = representative_sign?.slice(22);
        const representbuffer = Buffer.from(representativedata, 'base64');
        req.body.representative_sign = `${Date.now()}_represent_${task_name}_dwr.png`;
        Jimp.read(representbuffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`,
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                  `/../public/dwr/signature/${req.body.representative_sign}`,
              );
          }
        });
      }
    } else {
      req.body.representative_sign = '';
    }

    if (client_representative_sign !== '') {
      if (client_representative_sign.includes('dwr')) {
        req.body.client_representative_sign =
          req.body?.client_representative_sign;
      } else {
        const client_representativedata = client_representative_sign?.slice(22);
        const client_represent_buffer = Buffer.from(
          client_representativedata,
          'base64',
        );
        req.body.client_representative_sign = `${Date.now()}_clientrepresents_${task_name}_dwr.png`;
        Jimp.read(client_represent_buffer, (error, res) => {
          if (error) {
            logger.errorLog.error(
              `error at catch from image generation : ${error}`,
            );
          } else {
            res
              .quality(5)
              .write(
                __dirname +
                  `/../public/dwr/signature/${req.body.client_representative_sign}`,
              );
          }
        });
      }
    } else {
      req.body.client_representative_sign = '';
    }

    const updatedwrData = await dwr.findByIdAndUpdate(id, {
      task_id: task_id,
      task_date: task_date,
      user_id: labourCosts[0].employee,
      task_hour: labourCosts[0].hours,
      submit_status: submit_status,
      client_representative: client_representative,
      billing_line_items: {
        labourCosts: [labourCosts[0]],
        equipment: equipment,
      },
      project_managers_array: project_managers_array,
      remark: remark,
      client_approved_DWR: req.body.client_approved_DWR,
      representative_sign: req.body?.representative_sign,
      client_representative_sign: req.body.client_representative_sign,
    });
    const [deletePromise, updatePromise] = await Promise.all([updatedwrData]);

    if (deletePromise?.deletedCount > 0) {
      logger.accessLog.info('DWR deleted successfully');
    }

    if (labourCosts.length > 1) {
      const Promise_dwr = labourCosts.map(async (item, index) => {
        if (index !== 0) {
          const newdwr = await dwr.create({
            task_id: task_id,
            task_date: task_date,
            user_id: item.employee,
            task_hour: item.hours,
            submit_status: submit_status,
            client_representative: client_representative,
            billing_line_items: {
              labourCosts: [item],
              equipment: equipment,
            },
            submit_date: new Date().toISOString().split('T')[0],
            remark: remark,
            project_managers_array: project_managers_array,
            client_approved_DWR: req.body.client_approved_DWR,
            representative_sign: req.body.representative_sign,
            client_representative_sign: req.body.client_representative_sign,
          });
          await newdwr.save();
          await dwr.findByIdAndUpdate(newdwr._id, {
            $set: { dwr_number: newdwr.number.toString().padStart(6, '0') },
          });
        }
      });
      const allPromises = [Promise_dwr, updatedwrData];
      Promise.all(allPromises)
        .then((results) => {})
        .catch((error) => {
          console.error('One of the promises failed:', error);
        });
    }
    if (updatedwrData) {
      await updatedwrData.save();
      logger.accessLog.info('dwr Update Successfully');
      res.send({
        statusCode: 200,
        message: 'The DWR has been updated successfully',
      });
    }
  } catch (err) {
    logger.errorLog.error('dwr update fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateDwrStatus = async (req, res) => {
  try {
    const { status, estimateHour, uuid } = req.body;
    const { id } = req.params;

    const updateStatus = status === 'approve' ? 1 : 2;

    const dwrDoc = await dwr
      .findOne({ _id: id, is_deleted: false })
      .lean(false);
    if (!dwrDoc) {
      return res
        .status(404)
        .send({ statusCode: 404, message: 'DWR not found' });
    }

    let labourCost = dwrDoc.billing_line_items?.labourCosts?.[0];
    if (!labourCost) {
      return res
        .status(400)
        .send({ statusCode: 400, message: 'DWR has no labour cost' });
    }

    const cleanName = labourCost.costitem?.split(' - ')[0]?.trim();

    labourCost.estimate_hour = parseFloat(estimateHour);

    if (!labourCost.uuid) {
      labourCost.uuid = uuid;
    }

    dwrDoc.billing_line_items.labourCosts[0] = labourCost;

    dwrDoc.markModified('billing_line_items.labourCosts');

    dwrDoc.status = updateStatus;
    dwrDoc.estimate_hour = parseFloat(estimateHour);

    await dwrDoc.save();

    res.send({
      statusCode: 200,
      message: 'DWR status updated successfully',
    });
  } catch (err) {
    console.log('❌ Error updating DWR:', err);
    res.status(500).send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
    });
  }
};

exports.getDwrHoursByTaskId = async (req, res) => {
  try {
    const { task_id } = req.params;
    const dwrData = await dwr.aggregate([
      {
        $match: {
          task_id: mongoose.Types.ObjectId(task_id),
          is_deleted: false,
          status: 1,
        },
      },
      {
        $group: {
          _id: '$task_id',
          totalHours: { $sum: '$task_hour' },
        },
      },
    ]);

    logger.accessLog.info('dwr fetch success');
    res.send({
      statusCode: 200,
      message: 'The DWR has been fetched successfully',
      data: dwrData,
    });
  } catch (err) {
    logger.errorLog.error('Failed to fetch the DWR.');
    res.send({
      statusCode: 500,
      message: 'Failed to fetch the DWR',
      error: err,
    });
  }
};

exports.deleteDwr = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedwrData = await dwr.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    if (deletedwrData) {
      await deletedwrData.save();
      logger.accessLog.info('dwr delete successfully');
      res.send({
        statusCode: 200,
        message: 'The DWR has been deleted successfully',
        dwr: deletedwrData,
      });
    } else {
      res.send({
        statusCode: 404,
        message: 'The DWR could not be found',
      });
    }
  } catch (err) {
    logger.errorLog.error('dwr delete fail');
    res.send({
      statusCode: 500,
      message: 'Oops Something went wrong. Please contact the administrator',
      error: err,
    });
  }
};

exports.updateDwrStatusBulk = async (req, res) => {
  try {
    const { dwrs } = req.body;

    if (!dwrs || !dwrs.length) {
      return res.status(400).json({
        statusCode: 400,
        message: 'No DWRs provided',
      });
    }

    const results = [];

    for (const item of dwrs) {
      const { dwrId, managerEstimatedHours } = item;

      const existing = await dwr.findById(dwrId);
      if (!existing) {
        results.push({ dwrId, status: 'Not Found' });
        continue;
      }

      const hours = parseFloat(managerEstimatedHours) || 0;

      if (existing.billing_line_items?.labourCosts?.length) {
        existing.billing_line_items.labourCosts =
          existing.billing_line_items.labourCosts.map((labour) => {
            labour.estimate_hour = hours;
            return labour;
          });

        existing.markModified('billing_line_items');
      }

      existing.estimate_hour = hours;

      existing.status = 1;

      await existing.save();

      results.push({ dwrId, status: 'Updated' });
    }

    res.json({
      statusCode: 200,
      message: `DWR updated successfully`,
      data: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      statusCode: 500,
      message: 'Something went wrong. Please contact the administrator.',
      error: err.message,
    });
  }
};
