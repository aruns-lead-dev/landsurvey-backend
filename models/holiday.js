const mongoose = require('mongoose');

const holidaySchema = mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('holiday', holidaySchema, 'holidays');
