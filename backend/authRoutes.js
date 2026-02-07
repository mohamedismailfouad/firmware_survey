import express from 'express';
import Admin from './Admin.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username, password });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed default admin (runs once if no admin exists)
router.post('/seed', async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.json({ message: 'Admin already exists' });
    }

    const admin = new Admin({
      username: 'admin',
      password: 'azka2024',
    });
    await admin.save();
    res.json({ message: 'Default admin created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
