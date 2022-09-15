const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    UserId: Number,
    CardNumber: Number,
    Matricula: Number,
});

const MessageModel = module.exports = mongoose.model('users', UserSchema)
