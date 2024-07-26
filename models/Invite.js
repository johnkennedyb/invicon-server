// models/Invite.js
const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    inviteId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    usedBy: { type: String, default: null }
});

module.exports = mongoose.model('Invite', inviteSchema);
