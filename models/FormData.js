const mongoose = require('mongoose');

const FormDataSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    inviteLink: { type: String },
    inviteUsed: { type: Boolean, default: false },
    inviteUsedBy: { type: String, default: null },
    invites: { type: Number, default: 0 },
    tier: { type: Number, default: 0 },
});

const FormDataModel = mongoose.model('log_reg_form', FormDataSchema);

module.exports = FormDataModel;


module.exports = FormDataModel;