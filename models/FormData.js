const mongoose = require('mongoose');

const FormDataSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    inviteLink: { type: String },
    inviteUsed: { type: Boolean, default: false },
    inviteUsedBy: { type: String, default: null },
});

const FormDataModel = mongoose.model('log_reg_form', FormDataSchema);

module.exports = FormDataModel;