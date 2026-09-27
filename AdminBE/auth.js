const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ezzysync_master_super_admin_jwt_secret_key_2026';

// Middleware to verify Super Admin JWT
async function requireSuperAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }

    // Verify user in DB is still active and is_super_admin
    const userRes = await query('SELECT id, email, name, is_super_admin FROM users WHERE id = $1', [decoded.userId]);
    if (!userRes.rows[0] || !userRes.rows[0].is_super_admin) {
      return res.status(403).json({ error: 'Forbidden: Super Admin privileges revoked' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Login Handler for Super Admin
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query(`
      SELECT id, email, password_hash, name, is_super_admin 
      FROM users 
      WHERE LOWER(email) = $1
    `, [cleanEmail]);

    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or user not found' });
    }

    if (!user.is_super_admin) {
      return res.status(403).json({ error: 'Access Denied: This portal is strictly for EzzySync platform owners' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: true,
      },
    });
  } catch (err) {
    console.error('Super Admin Login Error:', err);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
}

// Current User Me Handler
async function me(req, res) {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isSuperAdmin: true,
    },
  });
}

module.exports = {
  requireSuperAdmin,
  login,
  me,
  JWT_SECRET,
};
