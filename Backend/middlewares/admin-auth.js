const JWT = require("jsonwebtoken");
const User = require('../models/User-Google')
require('dotenv').config();

module.exports = async function (req, res, next) {
    const token = req.header("auth-token")
    if (!token) return res.send(`No Token Entered !!`)

    try {
        const verified = JWT.verify(token, process.env.JWTTOKEN)
        const check = await User.findOne({email : verified.email})
        console.log(check)
        if (check.isCodechef){
            req.user = check 
            next()
        }else 
            res.send(`You Got NO Admin Access `)
    } catch (e) {
        console.log(e);
        res.send(e);
    }
}
