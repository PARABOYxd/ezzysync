const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/authMiddleware");
const gmailService = require("../services/gmailService");

router.post("/send-email", requireAuth, async (req, res) => {
    try {
        const { to } = req.body;

        await gmailService.sendEmail({
            tenantId: req.user.tenantId,
            to,
            subject: "EzzySync Gmail API Test",
            html: `
                <h2>Congratulations 🎉</h2>
                <p>Your Gmail API integration is working successfully.</p>
                <p>This email was sent using the connected Gmail account.</p>
            `,
        });

        res.json({
            success: true,
            message: "Email sent successfully.",
        });

    } catch (err) {
        req.log.error({ err }, 'Test email send failed');

        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});

module.exports = router;