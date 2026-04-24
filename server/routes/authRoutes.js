const express = require('express');
const router = express.Router();
const verifyUser = require('../middleware/authMiddleware'); // Bring in the bouncer

// GET /auth/me - Checks if the token is valid and returns user info
router.get('/me', verifyUser, (req, res) => {
  // If the code reaches here, the verifyUser middleware successfully passed!
  // req.user was securely attached by the middleware.
  
  res.status(200).json({
    status: "authenticated",
    message: "Your token is valid!",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      last_sign_in: req.user.last_sign_in_at
    }
  });
});

module.exports = router;