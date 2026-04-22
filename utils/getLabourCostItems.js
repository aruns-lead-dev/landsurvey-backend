const ratesheet = require("../models/ratesheet");

const EXCLUDED_RATESHEET_NAMES = ["NON BILLABLE"];
const EXCLUDED_SUB_CATEGORIES = ["Professional Fees", "Technical Fees", "Legal"];

const getLabourCostItems = async () => {
  const result = await ratesheet.aggregate([
    {
      $match: {
        active: true,
        is_deleted: false,
        name: { $nin: EXCLUDED_RATESHEET_NAMES },
      },
    },
    { $unwind: "$billable_line_items.labourItem" },
    {
      $lookup: {
        from: "cost_iteams",
        localField: "billable_line_items.labourItem.costItem",
        foreignField: "name",
        as: "cost_item_details",
      },
    },
    { $unwind: "$cost_item_details" },
    {
      $group: {
        _id: "$billable_line_items.labourItem.costItem",
        sub_categories: { $addToSet: "$cost_item_details.sub_category" },
      },
    },
    {
      $match: {
        sub_categories: {
          $not: { $elemMatch: { $in: EXCLUDED_SUB_CATEGORIES } },
        },
      },
    },
    {
      $group: {
        _id: null,
        costItems: { $addToSet: "$_id" },
      },
    },
    { $project: { _id: 0, costItems: 1 } },
  ]);

  return result.length > 0 ? result[0].costItems : [];
};

module.exports = getLabourCostItems;
