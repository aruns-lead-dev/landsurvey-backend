let mongoose = require('mongoose');

let employeeLeave = mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'job',
      default: null,
      index: true,
    },
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'task',
      default: null,
      index: true,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: null,
      index: true,
    },
    time_from: {
      type: String,
      default: null,
    },
    time_to: {
      type: String,
      default: null,
    },
    leave_type: {
      type: String,
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('employeeLeave', employeeLeave, 'employee_leaves');
