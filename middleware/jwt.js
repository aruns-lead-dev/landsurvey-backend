const jwt = require("jsonwebtoken");
const user = require("../models/user");

module.exports = {
  signAccessToken: (userData) => {
    return new Promise((resolve, reject) => {
      const payload = userData;
      const options = { expiresIn: "30d" };
      jwt.sign(userData, process.env.JWT_SECRET_KEY, options, async (err, token) => {
        const fetchUser = await user.findOne(userData)
        if (err) reject(err);
        resolve({ statusCode: 200, message: "LoggedIn Successfully", token: token, user: fetchUser });
      });
    });
  },

  verifyAccessToken: (req, res, next) => {
    if (req.originalUrl.split("/")[2] === "change-password-forgot" || req.originalUrl.split("/")[2] === "initial-change-password") {
      var permission = req.originalUrl.split("/")[2]
    }
    else if (req.originalUrl.split("?")[0].split("/").length > 3) {
      var permission = `${req.originalUrl.split("/")[2]}_${req.originalUrl.split("?")[0].split("/")[3]}`
    }
    else {
      var permission = `${req.originalUrl.split("?")[0].split("/")[2]}_read`
    }

    if (!req.headers["authorization"])
      return res.json({ message: "Access Denied" });
    const authHeader = req.headers["authorization"];
    const bearerToken = authHeader.split(" ");
    const token = bearerToken[1];
    if (token === "null") {
      res.json({ message: "Access Denied" })
    }

    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
      const fetchUser = await user.findOne(payload)
      if (!fetchUser) {
        res.send({ "massage": "user not authenticated please login again to check the API" })
      }
      else {
        const userPermissions = fetchUser?.permission;
        if (err) return res.json({ message: err });
        if (userPermissions?.includes(permission)) {
          next();
        }
        else {
          res.send({ "massage": "Permission needed" })
        }
      }
    });
  },
};

