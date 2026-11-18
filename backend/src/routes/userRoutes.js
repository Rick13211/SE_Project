import express from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { nlpClient } from '../services/nlpClient.js';

const router = express.Router();

// Update personal skill profile and bio (R5.1)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { bio = '', skills = [] } = req.body;

    let finalSkills = skills;
    // If skills not explicitly passed but bio is updated, auto-extract
    if (bio && (!skills || skills.length === 0)) {
      const nlp = await nlpClient.extractSkills(bio);
      finalSkills = nlp.extracted_skills || [];
    }

    const updated = db.update('users', req.user.id, {
      bio: bio.trim(),
      skills: Array.from(new Set(finalSkills.map(s => s.toLowerCase().trim())))
    });

    const { password: _, ...safeUser } = updated;

    db.logActivity(req.user.id, 'PROFILE_UPDATED', { skillsCount: finalSkills.length });

    res.json({
      message: 'Profile updated successfully.',
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Test/Analyze free-text bio with NLP extraction without saving (R5.2)
router.post('/analyze-skills', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for NLP skill analysis.' });
    }

    const result = await nlpClient.extractSkills(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'NLP skill extraction failed.' });
  }
});

// Get team members with their real-time workload (R2.3, R10.2)
router.get('/team', authenticate, (req, res) => {
  try {
    const members = db.filter('users', u => u.role === 'MEMBER' || u.role === 'TEAM_LEAD');

    const enriched = members.map(m => {
      const activeTasks = db.filter('tasks', t => t.assigneeId === m.id && t.status !== 'COMPLETED');
      const completedTasks = db.filter('tasks', t => t.assigneeId === m.id && t.status === 'COMPLETED');
      const totalPoints = activeTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);

      const ratings = db.filter('performance_ratings', r => r.userId === m.id);

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        skills: m.skills || [],
        bio: m.bio || '',
        workload: {
          activeTasksCount: activeTasks.length,
          activeEffortPoints: totalPoints,
          completedTasksCount: completedTasks.length,
          ratedTasksCount: ratings.length
        }
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve team members.' });
  }
});

export default router;

