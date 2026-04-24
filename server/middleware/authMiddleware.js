const supabase = require('../config/supabaseClient');

const verifyUser = async (req, res, next) => {
  // Check if the request has an Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];

  // Ask Supabase to verify the token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  // Token is valid! Attach the user info to the request so the next function can use it
  req.user = user;
  next(); // Proceed to the actual route (e.g., creating a room)
};

module.exports = verifyUser;