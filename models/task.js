let mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

let task = mongoose.Schema(
  {
    attachments: {
      type: String,
      default: '',
      index: true,
    },
    client_id: {
      type: String,
      default: null,
      index: true,
    },
    select_client_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    number_str: {
      type: String,
      default: null,
      index: true,
    },
    quote_id: {
      type: String,
      default: null,
      index: true,
    },
    company_name: {
      type: String,
      default: null,
      index: true,
    },
    job_id: {
      type: String,
      default: null,
      index: true,
    },

    project_manager: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    staff_members: {
      type: Array,
      default: [],
      index: true,
    },
    ratesheet_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    name: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: null,
      index: true,
    },
    client_location_id: {
      type: String,
      default: null,
      index: true,
    },
    select_client_location_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    completed_task_date: {
      type: Date,
      default: null,
      index: true,
    },
    client_address: {
      type: String,
      default: null,
      index: true,
    },
    office_id: {
      type: String,
      default: null,
      index: true,
    },
    select_office_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    task_category_id: {
      type: String,
      default: null,
      index: true,
    },
    select_task_category_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    task_scope_id: {
      type: String,
      default: null,
      index: true,
    },
    select_task_scope_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    gl_code_prefix: {
      type: String,
      default: null,
      index: true,
    },
    estimate_hour: {
      type: String,
      default: null,
      index: true,
    },
    total_cost_hour: {
      type: Number,
      default: null,
      index: true,
    },
    billing_line_items: {
      type: Object,
      default: {},
      index: true,
    },
    status: {
      type: String,
      default: null,
      index: true,
    },
    status_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    remark: {
      type: String,
      default: null,
      index: true,
    },
    active: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_completed: {
      type: Number,
      default: 0,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_invoice_generated: {
      type: Boolean,
      default: false,
      index: true,
    },
    invoice_id: {
      type: mongoose.Schema.ObjectId,
      default: null,
      index: true,
    },
    invoice_amount: {
      type: Number,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

autoIncrement.initialize(mongoose.connection);
task.plugin(autoIncrement.plugin, {
  model: 'task',
  field: 'number',
  startAt: 1,
  incrementBy: 1,
});

module.exports = mongoose.model('task', task);
