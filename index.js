require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');
const FormDataModel = require('./models/FormData');
const InviteModel = require('./models/Invite'); // Assuming you have a separate model for invites
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb+srv://deepcodesystems:deepcodesystems@cluster0.8jzadee.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY,
});

const sentFrom = new Sender("admin@trial-v69oxl59ezzg785k.mlsender.net", "Invicon");

app.post('/register', async (req, res) => {
    const { email, password, inviteId } = req.body;
    try {
        const user = await FormDataModel.findOne({ email });
        if (user) {
            return res.json("Already registered");
        }

        const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const newUser = new FormDataModel({
            email,
            password,
            verificationCode,
            verificationCodeExpires: Date.now() + 3600000, // 1 hour
            inviteId // Store the invite ID if available
        });
        await newUser.save();

        // Find the inviter and update their invite count
        if (inviteId) {
            const invite = await InviteModel.findOne({ inviteId });
            if (invite) {
                const inviter = await FormDataModel.findOne({ email: invite.generatedBy });
                if (inviter) {
                    inviter.inviteCount = (inviter.inviteCount || 0) + 1;
                    await inviter.save();
                }
            }
        }

        const recipients = [new Recipient(email, "User")];
        const emailParams = new EmailParams()
            .setFrom(sentFrom)
            .setTo(recipients)
            .setReplyTo(sentFrom)
            .setSubject("Email Verification")
            .setHtml(`
                <p>Thank you for registering with Invicon.</p>
                <p>Your verification code is: <strong>${verificationCode}</strong></p>
                <p>Please enter this code on the registration page to complete your sign up.</p>
            `);

        await mailerSend.email.send(emailParams);

        res.json("Verification email sent");
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post('/verify', async (req, res) => {
    const { email, verificationCode } = req.body;
    try {
        const user = await FormDataModel.findOne({
            email,
            verificationCode,
            verificationCodeExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).json("Invalid or expired verification code");
        }

        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();

        res.json("Email verified successfully");
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await FormDataModel.findOne({ email });
        if (user) {
            if (user.password === password) {
                res.json("Success");
            } else {
                res.json("Wrong password");
            }
        } else {
            res.json("No records found!");
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await FormDataModel.findOne({ email });
        if (!user) {
            return res.status(404).json("User not found");
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetLink = `https://invicon-client.onrender.com/reset?token=${token}`;

        const recipients = [new Recipient(email, "User")];
        const emailParams = new EmailParams()
            .setFrom(sentFrom)
            .setTo(recipients)
            .setReplyTo(sentFrom)
            .setSubject("Password Reset")
            .setHtml(`
                <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                <p>Please click on the following link to reset your password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            `);

        await mailerSend.email.send(emailParams);
        res.json("Password reset email sent");
    } catch (err) {
        console.error("Error sending email:", err);
        res.status(500).json("Error sending email");
    }
});

app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await FormDataModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json("Password reset token is invalid or has expired");
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json("Password has been reset");
    } catch (err) {
        res.status(500).json(err);
    }
});

app.post('/generate-invite', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        const inviteId = crypto.randomBytes(6).toString('hex'); // Unique invite ID
        const inviteLink = `https://invicon-client.onrender.com/register?inviteId=${inviteId}`;

        // Store inviteId in database
        const newInvite = new InviteModel({ inviteId, generatedBy: email });
        await newInvite.save();
        
        res.json({ inviteLink });
    } catch (error) {
        console.error('Error generating invite link:', error);
        res.status(500).json({ error: 'Error generating invite link' });
    }
});

app.get('/invite/:inviteId', async (req, res) => {
    const { inviteId } = req.params;
    const { usedBy } = req.query;

    try {
        const invite = await InviteModel.findOne({ inviteId });
        if (!invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }
        invite.inviteUsed = true;
        invite.inviteUsedBy = usedBy;
        await invite.save();
        
        const inviter = await FormDataModel.findOne({ email: invite.generatedBy });
        if (inviter) {
            inviter.inviteCount = (inviter.inviteCount || 0) + 1;
            await inviter.save();
        }
        
        res.json({ message: `Invite ${inviteId} used by ${usedBy}` });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

app.get('/invite-data', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await FormDataModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'Invite data not found' });
        }
        const inviteCount = await FormDataModel.countDocuments({ inviteUsedBy: email });
        const inviteData = {
            invites: inviteCount,
            tier: calculateTier(inviteCount)
        };
        res.json(inviteData);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

function calculateTier(inviteCount) {
    if (inviteCount >= 100) return 5;
    if (inviteCount >= 70) return 4;
    if (inviteCount >= 45) return 3;
    if (inviteCount >= 25) return 2;
    if (inviteCount >= 12) return 1;
    return 0;
}

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(3001, () => {
    console.log("Server listening on http://127.0.0.1:3001");
});

