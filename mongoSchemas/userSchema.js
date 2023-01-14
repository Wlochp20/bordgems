const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true },
    name: { type: String, require: true, unique: true },
    hash: { type: String, require: true, unique: false },
    email: { type: String, require: true, unique: true },
    password: { type: String, require: true, unique: false },
    follows: { type: String, require: true, unique: false },
});

const model = mongoose.model("UserModel", userSchema);

module.exports = model;