exports.CITY_PIPELINE = [
  {
    $lookup: {
      from: 'states',
      localField: 'state_id',
      foreignField: '_id',
      as: 'state',
    },
  },
  {
    $unwind: '$state',
  },
  {
    $project: {
      name: '$name',
      state: '$state.name',
      statess: '$state.name',
      remark: '$remark',
      state_id: '$state_id',
      is_deleted: '$is_deleted',
      createdAt: { $dateToString: { format: '%d-%m-%Y', date: '$createdAt' } },
      updatedAt: { $dateToString: { format: '%d-%m-%Y', date: '$updatedAt' } },
      sortCreatedAt: '$createdAt',
    },
  },
];

exports.COMMENT_PIPELINE = [
  {
    $lookup: {
      from: 'users',
      localField: 'user_id',
      foreignField: '_id',
      as: 'user',
    },
  },
  {
    $unwind: {
      path: '$user',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'tasks',
      localField: 'task_id',
      foreignField: '_id',
      as: 'task',
    },
  },
  {
    $unwind: {
      path: '$task',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      remark: 1,
      is_deleted: 1,

      // user details
      user: {
        user_id: '$user._id',
        user_first_name: '$user.first_name',
        user_last_name: '$user.last_name',
        user_email: '$user.email',
      },
      // task details
      task: {
        task_id: '$task._id',
        task_name: '$task.name',
        task_description: '$task.description',
      },

      createdAt: {
        $dateToString: { format: '%d-%m-%Y', date: '$createdAt' },
      },
      updatedAt: {
        $dateToString: { format: '%d-%m-%Y', date: '$updatedAt' },
      },

      sortCreatedAt: '$createdAt',
    },
  },
];

exports.STATE_PIPELINE = [
  {
    $lookup: {
      from: 'cities',
      let: { stateId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$state_id', '$$stateId'] } } },
        { $sort: { name: 1 } }, // Sorting alphabetically by city name
      ],
      as: 'city',
    },
  },
];

exports.CLIENT_PIPELINE = [
  // {
  //   '$sort': {
  //     'createdAt': -1
  //   }
  // },
  {
    $lookup: {
      from: 'payment_terms',
      localField: 'payment_terms',
      foreignField: 'name',
      as: 'payment_terms',
    },
  },
  {
    $unwind: '$payment_terms',
  },
  {
    $lookup: {
      from: 'client_attchments',
      localField: '_id',
      foreignField: 'client_id',
      as: 'attachments',
    },
  },
  {
    $lookup: {
      from: 'client_contacts',
      // localField: "_id",
      // foreignField: "client_id",
      let: { client_id: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$client_id', '$$client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'contacts',
    },
  },
  {
    $lookup: {
      from: 'client_locations',
      // localField: "_id",
      // foreignField: "client_id",
      let: { client_id: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$client_id', '$$client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'locations',
    },
  },
  {
    $lookup: {
      from: 'tasks',
      // localField: "_id",
      // foreignField: "client_id",
      let: { client_id: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$select_client_id', '$$client_id'] },
                { $eq: ['$is_completed', 0] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'taskscount',
    },
  },
  //  {
  //   '$lookup': {
  //     'from': 'jobs',
  //     'localField': '_id',
  //     'foreignField': 'client_id',
  //     'pipeline': [
  //       {
  //         '$project': {
  //           'name': '$client_project',
  //           'order_date': '$order_date',
  //           'due_date': '$due_date',
  //           'status': '$status',
  //           'job_number': '$number'
  //         }
  //       }
  //     ],
  //     'as': 'jobs'
  //   }
  // },
  // {
  // $lookup: {
  //   from: "jobs",
  //   let: { clientId: "$_id" },
  //   pipeline: [
  //     {
  //       $lookup: {
  //         from: "tasks",
  //         let: { jobId: "$number_str", clientId: "$$clientId" },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $and: [
  //                   { $eq: ["$job_id", "$$jobId"] },
  //                   { $eq: ["$select_client_id", "$$clientId"] }
  //                 ]
  //               }
  //             }
  //           }
  //         ],
  //         as: "related_tasks"
  //       }
  //     },
  //     {
  //       $match: {
  //         $expr: { $gt: [{ $size: "$related_tasks" }, 0] } // keep only jobs with related tasks
  //       }
  //     }
  //   ],
  //   as: "jobs"
  // }
  // },
  {
    $project: {
      client_number: '$number_str',
      client_num: '$number',
      company_name: '$company_name',
      company_email: '$company_email',
      remark: '$remark',
      active: '$active',
      client_type: '$client_type',
      // 'rate_sheet': '$rate_sheet',
      // 'rate_sheet_id': '$rate_sheet._id',
      payment_terms: '$payment_terms.name',
      // jobs: '$jobs',
      locations: '$locations',
      contacts: '$contacts',
      attachments: '$attachments',
      qb_customer_id: '$qb_customer_id',
      tasksdata: '$taskscount',
      SyncToken: '$SyncToken',
      createdAt: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: '$createdAt',
        },
      },
      updatedAt: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: '$updatedAt',
        },
      },
    },
  },
];

exports.TASK_PIPELINE = [
  {
    $lookup: {
      from: 'jobs',
      let: { number_str: '$job_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$number_str', '$$number_str'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'job_id',
    },
  },
  {
    $unwind: '$job_id',
  },
  {
    $lookup: {
      from: 'clients',
      let: { select_client_id: '$select_client_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$select_client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_id',
    },
  },
  {
    $unwind: '$client_id',
  },
  {
    $lookup: {
      from: 'client_contacts',
      let: { client_id: '$client_id._id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$client_id', '$$client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_contacts',
    },
  },
  {
    $lookup: {
      from: 'client_locations',
      let: { select_client_location_id: '$select_client_location_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$select_client_location_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_locations',
    },
  },
  {
    $lookup: {
      from: 'ratesheets',
      let: { ratesheet_id: '$ratesheet_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$ratesheet_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'ratesheet_id',
    },
  },
  {
    $unwind: '$ratesheet_id',
  },
  {
    $lookup: {
      from: 'dwrs',
      let: { taskId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$task_id', '$$taskId'] },
                { $eq: ['$is_deleted', false] },
              ],
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ],
      as: 'dwrs',
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'project_manager',
      foreignField: '_id',
      as: 'project_managers',
    },
  },
  {
    $lookup: {
      from: 'offices',
      let: { select_office_id: '$select_office_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$select_office_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'office_id',
    },
  },
  {
    $unwind: '$office_id',
  },
  {
    $lookup: {
      from: 'job_categories',
      let: { select_task_category_id: '$select_task_category_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$select_task_category_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'task_category_id',
    },
  },
  {
    $unwind: '$task_category_id',
  },
  {
    $lookup: {
      from: 'job_scopes',
      localField: 'select_task_scope_id',
      foreignField: '_id',
      as: 'task_scope_id',
    },
  },
  {
    $unwind: '$task_scope_id',
  },
  {
    $lookup: {
      from: 'job_statuses',
      let: { status_id: '$status_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$status_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'status_id',
    },
  },
  {
    $unwind: '$status_id',
  },
  {
    $lookup: {
      from: 'quotes',
      let: { quote_id: '$quote_id' }, // Use a variable for job_id
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$number_str', '$$quote_id'] }, // Match only if job_id exists
          },
        },
        { $limit: 1 },
      ],
      as: 'quote_id',
    },
  },
  {
    $unwind: {
      path: '$quote_id',
      preserveNullAndEmptyArrays: true, // Include documents without a job_id match
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'project_manager',
      foreignField: '_id',
      as: 'project_manager_detail',
    },
  },
  { $unwind: '$project_manager_detail' },
  {
    $lookup: {
      from: 'invoices',
      localField: 'invoice_id',
      foreignField: '_id',
      as: 'invoice_id',
    },
  },
  {
    $unwind: {
      path: '$invoice_id',
      preserveNullAndEmptyArrays: true,
    },
  },
];

exports.SCHEDULING_PIPELINE = [
  {
    $lookup: {
      from: 'tasks',
      localField: 'task_id',
      foreignField: '_id',
      as: 'task',
    },
  },
  {
    $unwind: '$task',
  },
  {
    $lookup: {
      from: 'jobs',
      let: { number_str: '$job_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$number_str', '$$number_str'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'job_id',
    },
  },
  {
    $unwind: '$job_id',
  },
  {
    $lookup: {
      from: 'clients',
      let: { select_client_id: '$select_client_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$select_client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_id',
    },
  },
  {
    $unwind: '$client_id',
  },
  {
    $lookup: {
      from: 'users',
      let: { manager_ids: { $ifNull: ['$project_managers.manager', []] } },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$_id', '$$manager_ids'] },
          },
        },
        {
          $project: {
            _id: 1,
            first_name: 1,
            last_name: 1,
          },
        },
      ],
      as: 'project_managers',
    },
  },
  {
    $lookup: {
      from: 'users',
      let: { member_ids: { $ifNull: ['$assigned_members.employee', []] } },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$_id', '$$member_ids'] },
          },
        },
        {
          $project: {
            _id: 1,
            first_name: 1,
            last_name: 1,
          },
        },
      ],
      as: 'assigned_members',
    },
  },

  {
    $lookup: {
      from: 'comments',
      let: { comment_ids: { $ifNull: ['$comments.comment_id', []] } },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$_id', '$$comment_ids'] },
          },
        },
        {
          $project: {
            _id: 0,
            remark: 1,
            createdAt: 1,
          },
        },
      ],
      as: 'comments',
    },
  },
  {
    $addFields: {
      document_link: { $ifNull: ['$document_link', ''] },
    },
  },
  {
    $project: {
      task: 1,
      task_number: 1,
      job_id: 1,
      client_id: 1,
      group_number: 1,
      sequence_number: 1,
      planned_date: 1,
      task_scope_id: 1,
      cost_item: 1,
      estimated_hours: 1,
      is_deleted: 1,
      job_id: 1,
      client_id: 1,
      project_managers: 1,
      assigned_members: 1,
      comments: 1,
      document_link: 1,
      status: 1,
      createdAt: { $dateToString: { format: '%d-%m-%Y', date: '$createdAt' } },
      updatedAt: { $dateToString: { format: '%d-%m-%Y', date: '$updatedAt' } },
    },
  },
];

exports.QUOTE_TASK_PIPELINE = [
  {
    $lookup: {
      from: 'quotes',
      let: { quote_id: '$quote_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$number_str', '$$quote_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'quote_id',
    },
  },
  {
    $unwind: '$quote_id',
  },
];

exports.JOB_PIPELINE = [
  // {
  //   '$sort': {
  //     'createdAt': -1
  //   }
  // },

  // {
  //   '$lookup': {
  //     'from': 'tasks',
  //     'localField': 'number_str',
  //     'foreignField': 'job_id',
  //     'as': 'tasks'
  //   }
  // },
  {
    $lookup: {
      from: 'tasks',
      let: { number_str: '$number_str' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$job_id', '$$number_str'] },
                { $eq: ['$is_deleted', false] },
              ],
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ],
      as: 'tasks',
    },
  },
  // {
  //   '$lookup': {
  //     'from': 'clients',
  //     'localField': 'client_id',
  //     'foreignField': '_id',
  //     'as': 'clientdata'
  //   }
  // },
  // {
  //   '$unwind': '$clientdata'
  // },
  {
    $lookup: {
      from: 'job_statuses',
      // localField: "status_id",
      // foreignField: "_id",
      let: { status_id: '$status_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$status_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'status_id',
    },
  },
  {
    $unwind: '$status_id',
  },
  {
    $project: {
      job_number: '$number_str',
      job_num: '$number',
      project_name: '$client_project',
      sub_contract: '$sub_contract',
      status: '$status',
      status_id: '$status_id',
      po: '$po',
      po_amount: '$po_amount',
      invoice_line_item_type: '$invoice_line_item_type',
      taxes_name: '$taxes_name',
      tax: '$taxes',
      fee: '$fees',
      remark: '$remark',
      active: '$active',
      pdf_name: '$pdf_name',
      task: '$tasks',
      client_id: '$client_id',
      clientdata: '$clientdata',
      is_deleted: '$is_deleted',
      order_date: '$order_date',
      due_date: '$due_date',
      locations: '$locations',
      createdAt: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: '$createdAt',
        },
      },
      updatedAt: {
        $dateToString: {
          format: '%d-%m-%Y',
          date: '$updatedAt',
        },
      },
    },
  },
];

exports.QUOTE_PIPELINE = [
  {
    $lookup: {
      from: 'clients',
      let: { client_id: '$client_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_id',
    },
  },
  {
    $unwind: {
      path: '$client_id',
      preserveNullAndEmptyArrays: true, // Include documents without a client_id match
    },
  },
  {
    $lookup: {
      from: 'ratesheets',
      let: { ratesheet_id: '$ratesheet_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$ratesheet_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'ratesheet_id',
    },
  },
  {
    $unwind: '$ratesheet_id',
  },
  {
    $lookup: {
      from: 'jobs',
      let: { job_id: '$job_id' }, // Use a variable for job_id
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$job_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'job_id',
    },
  },
  {
    $unwind: {
      path: '$job_id',
      preserveNullAndEmptyArrays: true, // Include documents without a job_id match
    },
  },
  {
    $project: {
      client_number: '$client_id.number_str',
      job_number: '$job_id.number_str',
      client_name: '$client_id.company_name',
      ratesheet_name: '$ratesheet_id.name',
      billable_line_items: '$billable_line_items',
      project_manager: '$project_manager',
      quote_number: '$quote_number',
      number: '$number',
      number_str: '$number_str',
      name: '$name',
      total_estimated_hour: '$total_estimated_hour',
      total_cost_hour: '$total_cost_hour',
      description: '$description',
      remark: '$remark',
      attachment: '$attachment',
      active: '$active',
      client_id: '$client_id',
      job_id: '$job_id',
      ratesheet_id: '$ratesheet_id',
      is_converted: '$is_converted',
      createdAt: '$createdAt',
      site_location: '$site_location',
    },
  },
];
exports.DWR_PIPELINE = [
  {
    $lookup: {
      from: 'tasks',
      // localField: "task_id",
      // foreignField: "_id",
      let: { task_id: '$task_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$task_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'taskdata',
    },
  },
  {
    $unwind: '$taskdata',
  },
  {
    $lookup: {
      from: 'dwrs', // collection name for DWRs
      let: { taskId: '$taskdata._id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$task_id', '$$taskId'] },
                { $eq: ['$is_deleted', false] },
              ],
            },
          },
        },
        { $sort: { createdAt: -1 } }, // optional: sort by created date
      ],
      as: 'allDwrForTask',
    },
  },
  {
    $lookup: {
      from: 'users',
      // localField: "taskdata.project_manager",
      // foreignField: "_id",
      let: { taskData: '$taskdata.project_manager' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$taskData'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'project_managers',
    },
  },
  {
    $lookup: {
      from: 'users',
      // localField: "taskdata.project_manager",
      // foreignField: "_id",
      let: { projectManager: '$taskdata.project_manager' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$projectManager'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'project_manager_detail',
    },
  },
  { $unwind: '$project_manager_detail' },
  {
    $lookup: {
      from: 'users',
      // localField: "user_id",
      // foreignField: "_id",
      let: { user_id: '$user_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$user_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'userdata',
    },
  },
  {
    $unwind: '$userdata',
  },
  {
    $lookup: {
      from: 'jobs',
      // localField: "taskdata.job_id",
      // foreignField: "number_str",
      let: { jobId: '$taskdata.job_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$number_str', '$$jobId'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'project_manager',
    },
  },
  {
    $unwind: '$project_manager',
  },
  {
    $project: {
      task_name: '$taskdata.name',
      task_id: '$taskdata._id',
      user_id: '$userdata._id',
      user_firstname: '$userdata.first_name',
      user_lastname: '$userdata.last_name',
      manager_id: '$project_manager.project_manager_id',
      job_number: '$taskdata.job_id',
      ratesheet_name: '$ratesheet_id.name',
      billing_line_items: '$billing_line_items',
      project_manager: '$taskdata.project_manager',
      project_managers: '$project_managers',
      project_manager_detail: '$project_manager_detail',
      dwr_number: '$dwr_number',
      status: '$status',
      client_representative: '$client_representative',
      submit_status: '$submit_status',
      estimate_hour: '$estimate_hour',
      task_hour: '$task_hour',
      description: '$description',
      remark: '$remark',
      client_representative_sign: '$client_representative_sign',
      representative_sign: '$representative_sign',
      client_approved_DWR: '$client_approved_DWR',
      submit_date: '$submit_date',
      task_date: '$task_date',
      taskdata: '$taskdata',
      createdAt: '$createdAt',
      is_deleted: '$is_deleted',
      allDwrForTask: 1,
    },
  },
];

exports.INVOICE_PIPELINE = [
  {
    $sort: {
      createdAt: -1,
    },
  },
  {
    $lookup: {
      from: 'clients',
      let: { client_id: '$client_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$client_id'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'client_id',
    },
  },
  {
    $unwind: '$client_id',
  },
  {
    $lookup: {
      from: 'tasks',
      let: { task_ids: '$task_ids' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$_id', '$$task_ids'] },
                { $eq: ['$is_deleted', false] }, // Exclude deleted ratesheets
              ],
            },
          },
        },
      ],
      as: 'task_details',
    },
  },
  {
    $unwind: '$task_details',
  },

  {
    $lookup: {
      from: 'jobs',
      localField: 'task_details.job_id',
      foreignField: 'number_str',
      as: 'job_details',
    },
  },
  {
    $unwind: '$job_details',
  },

  {
    $lookup: {
      from: 'job_scopes',
      localField: 'task_details.select_task_scope_id',
      foreignField: '_id',
      as: 'task_scope_id',
    },
  },
  {
    $unwind: '$task_scope_id',
  },
  {
    $set: {
      'task_details.task_scope_id': '$task_scope_id',
    },
  },
  {
    $unset: 'task_scope_id', // Remove the separate field after merging
  },
  {
    $set: {
      project_managers: '$task_details.project_manager',
    },
  },
];
exports.TOKEN_PIPELINE = [
  {
    $sort: {
      number: -1,
    },
  },
];

exports.CLIENT_TASK_PIPELINE = (clientObjectId) => [
  // Match tasks for this client
  {
    $match: {
      select_client_id: clientObjectId, // already an ObjectId
      is_deleted: false,
    },
  },
  // Lookup the related job for each task
  {
    $lookup: {
      from: 'jobs',
      let: { taskJobId: '$job_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$number_str', '$$taskJobId'] },
                { $eq: ['$is_deleted', false] },
              ],
            },
          },
        },
      ],
      as: 'job',
    },
  },
  {
    $unwind: {
      path: '$job',
      preserveNullAndEmptyArrays: true, // task may exist without job
    },
  },
  // Group by job to remove duplicates
  {
    $group: {
      _id: '$job._id',
      job_number: { $first: '$job.number_str' },
      job_status: { $first: '$job.status' },
      job_locations: { $first: '$job.locations' },
      tasks: {
        $push: {
          task_number: '$number_str',
          task_name: '$name',
          task_status: '$status',
          createdAt: '$createdAt',
          updatedAt: '$updatedAt',
        },
      },
    },
  },
  // Optional: project final shape
  {
    $project: {
      job_id: '$_id',
      job_number: 1,
      job_status: 1,
      job_locations: 1,
      tasks: 1,
    },
  },
];
