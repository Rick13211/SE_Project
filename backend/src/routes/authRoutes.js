import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { nlpClient } from '../services/nlpClient.js';

const router = express.Router();

// Register new user (R1.1)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'MEMBER', bio = '', skills = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Hash password (R1.3, R4.3)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-extract skills from bio text via NLP if provided
    let extractedSkills = skills;
    if (bio && (!skills || skills.length === 0)) {
      const nlpResult = await nlpClient.extractSkills(bio);
      extractedSkills = nlpResult.extracted_skills || [];
    }

    const newUser = {
      id: `usr_${uuidv4()}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role.toUpperCase(), // 'ADMIN', 'TEAM_LEAD', 'MEMBER'
      bio: bio.trim(),
      skills: extractedSkills,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    db.insert('users', newUser);
    db.logActivity(newUser.id, 'USER_REGISTERED', { email: newUser.email, role: newUser.role });

    const token = generateToken(newUser);
    const { password: _, ...userSafe } = newUser;

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login (R1.2, R1.4)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'This account has been deactivated by an Administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const { password: _, ...userSafe } = user;

    db.logActivity(user.id, 'USER_LOGGED_IN', { email: user.email, role: user.role });

    res.json({
      message: 'Login successful.',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get currently authenticated user
router.get('/me', authenticate, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json({ user: userSafe });
});

export default router;

