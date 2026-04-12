const logger = require("../middleware/logger");
const user = require("../models/user");
const bcrypt = require("bcrypt");
const { signAccessToken } = require("../middleware/jwt");
const generatePassword = require("../utils/passwordGenerator");
const { default: axios } = require("axios");
const saltRounds = 10;
const nodemailer = require("nodemailer");
const { emailConfig } = require("../config/emailConfig");
const ejs = require("ejs");
const {
  employees_permission,
  manager_permission,
  admin_permission,
} = require("../utils/permissions");

exports.readUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = await user.findOne({ _id: id, is_deleted: false });
    res.send({
      statusCode: 200,
      message: "The user has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the user.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the user",
      error: err,
    });
  }
};

exports.readUserByRole = async (req, res) => {
  try {
    const { role } = req.params;
    let userData;
    if (role === "admin") {
      // If admin, fetch only employee and manager data
      userData = await user.find({
        role: { $in: ["employee", "manager"] },
        is_deleted: false,
      });
    } else {
      // For manager or employee, fetch data based on their role
      userData = await user.find({ role: role, is_deleted: false });
    }
    logger.accessLog.info("user fetch success");
    res.send({
      statusCode: 200,
      message: "The user has been fetched successfully",
      data: userData,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the user.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the user",
      error: err,
    });
  }
};

exports.readUser = async (req, res) => {
  try {
    var page = req.query.page;
    var per_page = req.query.per_page;
    var search = req.query.search;
    var sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    if (page === undefined) {
      page = "1";
    }
    if (per_page === undefined) {
      per_page = process.env.PAGINATION;
    }
    const data = page * per_page - per_page;
    if (search === "") {
      var totalDataCount = await user.countDocuments({
        role: { $in: ["employee", "manager"] },
        is_deleted: false,
      });
      var allUsers = await user
        .find({ role: { $in: ["employee", "manager"] }, is_deleted: false })
        .skip(data)
        .limit(per_page)
        .sort({ createdAt: sortOrder });
    } else {
      var totalDataCount = await user.countDocuments({
        $and: [
          { role: { $in: ["employee", "manager"] } },
          { is_deleted: false },
          {
            $or: [
              { first_name: { $regex: search, $options: "i" } },
              { last_name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ],
          },
        ],
      });
      var allUsers = await user
        .find({
          $and: [
            { role: { $in: ["employee", "manager"] } },
            { is_deleted: false },
            {
              $or: [
                { first_name: { $regex: search, $options: "i" } },
                { last_name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            },
          ],
        })
        .skip(data)
        .limit(per_page)
        .sort({ createdAt: sortOrder });
    }
    logger.accessLog.info("Failed to fetch the user.");
    res.send({
      statusCode: 200,
      message: "The user has been fetched successfully",
      total: totalDataCount,
      data: allUsers,
    });
  } catch (err) {
    logger.errorLog.error("Failed to fetch the user.");
    res.send({
      statusCode: 500,
      message: "Failed to fetch the user",
      error: err,
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    const emails = await user.find({ email: email });
    if (emails.length === 0) {
      const password = generatePassword(12);
      bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(password, salt, async function (err, hash) {
          req.body.password = hash;
          const newUser = await user.create(req.body);
          if (role === "employee") {
            newUser.permission = employees_permission;
          }
          if (role === "manager") {
            newUser.permission = manager_permission;
          }
          if (role === "admin") {
            newUser.permission = admin_permission;
          }
          if (newUser) {
            await newUser.save();
            let transporter = nodemailer.createTransport(emailConfig);
            ejs.renderFile(
              __dirname + "/../views/email/accountCreated.ejs",
              { user: newUser, password: password },
              (err, data) => {
                if (err) {
                  return { statusCode: 500, message: `Error : ${err}` };
                } else {
                  const mailData = {
                    from: `Elevated Land Surveying <${process.env.SMTP_EMAIL}>`,
                    to: `${newUser.first_name} ${newUser.last_name} <${email}>`,
                    subject: "Your Account Has Been Created!",
                    html: data,
                  };
                  transporter.sendMail(mailData, (error, info) => {
                    if (error) {
                      console.log(error);
                      return { statusCode: 500, message: `Error : ${error}` };
                    } else {
                      console.log(info);
                      return {
                        statusCode: 200,
                        message: `Your Account Has Been Created!`,
                        data: { email: req.body.email },
                      };
                    }
                  });
                }
              }
            );

            res.send({
              statusCode: 200,
              message: "User Created Successfully",
              data: { email: req.body.email },
            });
          }
        });
      });
    } else {
      res.send({
        statusCode: 500,
        message: "Email Already Exist Try Other Email",
      });
    }
  } catch (err) {
    logger.errorLog.error("user create fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator.",
      error: err,
    });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch current user
    const currentUser = await user.findById(id);
    if (!currentUser) {
      return res.status(404).send({
        statusCode: 404,
        message: "User not found",
      });
    }

    // Check if role is changing
    if (req.body.role && req.body.role !== currentUser.role) {
      if (req.body.role === 'manager') {
        req.body.permission = manager_permission;
      } else if (req.body.role === 'employee') {
        req.body.permission = employees_permission;
      }
    }

    // Update user
    const updatedUser = await user.findByIdAndUpdate(id, req.body, { new: true });
    if (updatedUser) {
      logger.accessLog.info("user update success");
      return res.send({
        statusCode: 200,
        message: "The user has been updated successfully",
        user: updatedUser,
      });
    } else {
      logger.accessLog.info("user update fail");
      return res.status(500).send({
        statusCode: 500,
        message: "Update failed",
      });
    }
  } catch (err) {
    logger.errorLog.error("user update fail", err);
    res.status(500).send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};


exports.editUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name } = req.body;
    const updateUser = await user.findByIdAndUpdate(id, {
      $set: { first_name: first_name, last_name: last_name },
    });
    if (updateUser) {
      await updateUser.save();
      logger.accessLog.info("user edit successfully");
      const newUser = await user.findById(id);
      res.send({
        statusCode: 200,
        message: "The user has been edited successfully",
        user: newUser,
      });
    }
  } catch (err) {
    logger.errorLog.error("user edit fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.initialChangePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userData = await user.findById(id);
    if (userData) {
      bcrypt.genSalt(saltRounds, function (err, salt) {
        if (!err) {
          bcrypt.hash(password, salt, async function (err, hash) {
            if (!err) {
              req.body.password = hash;
              const newUser = await user.findByIdAndUpdate(id, {
                $set: { password: req.body.password, password_changed: true },
              });
              if (newUser) {
                await newUser.save();
                const token = await signAccessToken({
                  email: newUser.email,
                  password: hash,
                });
                logger.accessLog.info("Password Changed Successfull");
                res.send({
                  statusCode: 200,
                  message: "The password has been changed successfully",
                  token: token.token,
                  user: { ...newUser._doc, password_changed: true },
                });
              }
            } else {
              console.log(err);
            }
          });
        } else {
          console.log(err);
        }
      });
    } else {
      logger.accessLog.info("User Not Found");
      res.send({ statusCode: 404, message: "The user could not be found" });
    }
  } catch (err) {
    logger.errorLog.error("Password Chnage fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { curr_password, password } = req.body;
    const userData = await user.findById(id);
    bcrypt.compare(
      curr_password,
      userData.password,
      async function (err, result) {
        if (result) {
          bcrypt.genSalt(saltRounds, function (err, salt) {
            if (!err) {
              bcrypt.hash(password, salt, async function (err, hash) {
                if (!err) {
                  req.body.password = hash;
                  const newUser = await user.findByIdAndUpdate(id, {
                    $set: { password: req.body.password },
                  });
                  if (newUser) {
                    await newUser.save();
                    const token = await signAccessToken({
                      email: newUser.email,
                      password: hash,
                    });
                    logger.accessLog.info("Password Changed Successfull");
                    res.send({
                      statusCode: 200,
                      message: "The password has been changed successfully",
                      token: token.token,
                      user: newUser,
                    });
                  }
                } else {
                  console.log(err);
                }
              });
            } else {
              console.log(err);
            }
          });
        } else {
          res.send({
            statusCode: 404,
            message: "Current password does not match. Try again",
            error: err,
          });
        }
      }
    );
  } catch (err) {
    logger.errorLog.error("Password Chnage fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteUser = await user.findByIdAndUpdate(id, {
      $set: { is_deleted: true },
    });
    logger.accessLog.info("user delete fail");
    res.send({
      statusCode: 200,
      message: "The user has been deleted successfullyy",
      user: deleteUser,
    });
  } catch (err) {
    logger.errorLog.error("user delete fail");
    res.send({
      statusCode: 500,
      message: "Oops Something went wrong. Please contact the administrator",
      error: err,
    });
  }
};
