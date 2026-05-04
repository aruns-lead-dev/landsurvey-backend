const nodemailer = require('nodemailer');
const ejs = require('ejs');
const user = require('../models/user');
const token = require('../server');
const { emailConfig } = require('../config/emailConfig');
require('dotenv').config();

exports.forgotPasswordWorker = async (job) => {
  const isUser = await user.findById(job.data.userId);
  if (isUser) {
    const tokenTemp = token.stamp.setupToken(86400000, {
      email: job.data.email,
      id: job.data.userId,
    });
    let transporter = nodemailer.createTransport(emailConfig);
    ejs.renderFile(
      __dirname + '/../views/email/resetPassword.ejs',
      {
        resetLink: `${process.env.FORNTEND_URL}/confirm-password/${tokenTemp}`,
      },
      (err, data) => {
        if (err) {
          return { statusCode: 500, message: `Error : ${err}` };
        } else {
          const mailData = {
            from: `Elevated Land Surveying <${process.env.SMTP_EMAIL}>`,
            to: `${isUser.first_name} ${isUser.last_name} <${job.data.email}>`,
            subject: 'Reset Password Link from Land Surveying',
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
                message: `Reset Link Sended to ${job.data.email} Successfully`,
              };
            }
          });
        }
      },
    );
    return {
      statusCode: 200,
      message: `Reset Link Sended to ${job.data.email} Successfully`,
    };
  }
};
