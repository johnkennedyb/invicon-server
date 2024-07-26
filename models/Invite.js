const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
    inviteId: { type: String, required: true, unique: true },
    generatedBy: { type: String, required: true },
    inviteUsed: { type: Boolean, default: false },
    inviteUsedBy: { type: String, default: null }
});

module.exports = mongoose.model('Invite', InviteSchema);
