const { createQueueMQ } = require("../config/bullMQ");

exports.forgotPasswordQueue = createQueueMQ('Forgot Password');

exports.forgotPasswordService = (req, res) => {
    const { email, userId } = req.body
    this.forgotPasswordQueue.add('Forgot Password Job Add', { email: email, userId: userId }, { attempts: 3, delay: 30000, removeOnComplete: false, removeOnFail: false, backoff: { type: "fixed", delay: 30000 } });
    res.json({
        statusCode: 200,
        message: "Forgot Password Job Added Successfully",
    });
}

