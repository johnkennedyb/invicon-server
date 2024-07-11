require('dotenv').config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');
const FormDataModel = require('./models/FormData');

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

const sentFrom = new Sender("admin@trial-v69oxl59ezzg785k.mlsender.net", "john");

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await FormDataModel.findOne({ email });
        if (user) {
            res.json("Already registered");
        } else {
            const newUser = new FormDataModel(req.body);
            await newUser.save();
            res.json(newUser);
        }
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

        const resetLink = `https://invicon-client.onrender.com/reset-password?token=${token}`;

        console.log("Password reset token generated:", token);

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


app.listen(3001, () => {
    console.log("Server listening on http://127.0.0.1:3001");
});
