const mongoose = require('mongoose');

const Task = require('./models/task'); // adjust path
const Scheduling = require('./models/scheduling'); // adjust path
const getLabourCostItems = require('./utils/getLabourCostItems');

const MONGO_URI =
  'mongodb+srv://arunsimon2007_db_user:MpvsNnS2tUxM7WSl@cluster0.iqtw6ge.mongodb.net/land-servey-live?appName=Cluster0'; // change

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ DB Connected');

    const validCostItems = await getLabourCostItems();
    console.log(
      `✅ Valid cost items (${validCostItems.length}):`,
      validCostItems,
    );

    const tasks = await Task.aggregate([
      {
        $match: {
          active: true,
          is_completed: 0,
          is_deleted: false,
        },
      },
      {
        $addFields: {
          'billing_line_items.labour_item.labour_cost_items': {
            $filter: {
              input: '$billing_line_items.labour_item.labour_cost_items',
              as: 'item',
              cond: {
                $in: ['$$item.costItem', validCostItems],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$billing_line_items.labour_item.labour_cost_items',
        },
      },
      {
        $project: {
          _id: 0,
          taskid: '$_id',
          job_id: '$job_id',
          select_client_id: '$select_client_id',
          project_managers: '$project_manager',
          select_client_location_id: '$select_client_location_id',
          task_scope: '$task_scope_id',
          cost_item:
            '$billing_line_items.labour_item.labour_cost_items.costItem',
          cost_uuid:
            '$billing_line_items.labour_item.labour_cost_items.uuid',
          group_number: '0',
          sequence_number: '0',
          planned_date: null,
          assigned_members: [],
          comments: [],
          status: 'open',
          estimated_hour:
            '$billing_line_items.labour_item.labour_cost_items.estimated_hour',
          document_link: '',
          is_deleted: 'false',
          createdAt: '2026-03-21T02:31:09.252Z',
          updatedAt: '2026-03-21T02:31:09.252Z',
        },
      },
    ]);

    console.log(`📦 Found ${tasks.length} tasks`);

    console.log(tasks);

    const bulkOps = [];

    for (const task of tasks) {
      // Skip if no number_str
      //if (!task.number_str) continue;

      const schedulingDoc = {
        task_id: task.taskid,
        job_id: task.job_id,
        select_client_id: task.select_client_id || '',

        project_managers: task.project_managers
          ? [{ manager: task.project_managers }]
          : [],
        task_scope_id: task.task_scope || null,
        estimated_hours: task.estimated_hour
          ? Number(task.estimated_hour)
          : null,
        group_number: 0, // default (customize if needed)
        sequence_number: 0, // default
        planned_date: null,
        cost_item: task.cost_item ? [task.cost_item] : [],
        cost_uuid: task.cost_uuid || null,
        assigned_members: [],
        comments: [],
        status: 'open',
        is_deleted: false,
      };

      bulkOps.push({
        insertOne: { document: schedulingDoc },
      });
    }

    if (bulkOps.length > 0) {
      console.log('Bulk writing...');

      await Scheduling.bulkWrite(bulkOps);
    }

    console.log(`🚀 Migrated ${bulkOps.length} records`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
