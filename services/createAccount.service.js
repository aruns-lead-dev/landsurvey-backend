
const { createQueueMQ } = require("../config/bullMQ");

exports.createAccountQueue = createQueueMQ('Create Account');

exports.createAccountService = (req, res) => {

    const { email, userId, password } = req.body
    this.createAccountQueue.add('Create Account Job Add', { email: email, password: password, userId: userId },
        {
            attempts: 3, delay: 30000, removeOnComplete: false, removeOnFail: false, timeout: 30000,
            backoff: { type: "fixed", delay: 30000 }
        });

    res.json({
        statusCode: 200,
        message: "Create Account Job Added Successfully",
    });
}


