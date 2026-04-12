const nodemailer = require("nodemailer");
const ejs = require("ejs");
const user = require('../models/user');
const { emailConfig } = require("../config/emailConfig")
require('dotenv').config()

exports.createAccountWorker = async (job) => {
    const isUser = await user.findById(job.data.userId)
    if (isUser) {
        let transporter = nodemailer.createTransport(emailConfig)
        ejs.renderFile(__dirname + '/../views/email/accountCreated.ejs', { user: isUser, password: job.data.password }, (err, data) => {
            if (err) {
                return { statusCode: 500, message: `Error : ${err}` };
            } else {
                const mailData = {
                    from: `Elevated Land Surveying <${process.env.SMTP_EMAIL}>`,
                    to: `${isUser.first_name} ${isUser.last_name} <${job.data.email}>`,
                    subject: "Your Account Has Been Created!",
                    html: data
                }
                transporter.sendMail(mailData, (error, info) => {

                    if (error) {
                        console.log(error);
                        return { statusCode: 500, message: `Error : ${error}` };
                    }
                    else {
                        console.log(info);
                        return { statusCode: 200, message: `Your Account Has Been Created!`, data: { user: isUser, password: job.data.password } };
                    }
                });
            }
        });
        return { statusCode: 200, message: `Your Account Has Been Created!`, data: { user: isUser, password: job.data.password } };
    }
}