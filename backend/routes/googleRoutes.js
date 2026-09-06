const express = require("express");
const router = express.Router();

const googleController = require("../controllers/googleController");
const { requireAuth } = require("../middleware/authMiddleware");

// The OAuth pair carries its own signed token in the query string, because the
// browser is redirected here by Google rather than by our app.
router.get("/auth", googleController.googleAuth);
router.get("/callback", googleController.googleCallback);

// These two are ordinary in-app calls and use the normal bearer token.
router.get("/gmail/status", requireAuth, googleController.gmailStatus);
router.post("/gmail/disconnect", requireAuth, googleController.disconnectGmail);

module.exports = router;