import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

const VALID_RATINGS = ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'];

// Rate a completed task (R6.1, R6.2, R6.3)
router.post('/rate', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const { taskId, rating, feedback = '' } = req.body;

    if (!taskId || !rating) {
      return res.status(400).json({ error: 'taskId and rating are required.' });
    }

    const normalizedRating = rating.toUpperCase();
    if (!VALID_RATINGS.includes(normalizedRating)) {
      return res.status(400).json({
        error: `Rating must be one of: ${VALID_RATINGS.join(', ')}`
      });
    }

    const task = db.findById('tasks', taskId);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (task.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only COMPLETED tasks can be rated.' });
    }

    if (!task.assigneeId) {
      return res.status(400).json({ error: 'Task does not have an assignee to rate.' });
    }

    // Check if rating already exists for this task
    const existing = db.findOne('performance_ratings', r => r.taskId === taskId);
    if (existing) {
      return res.status(400).json({ error: 'This task has already been rated.' });
    }

    const ratingEntry = {
      id: `rate_${uuidv4()}`,
      taskId: task.id,
      taskTitle: task.title,
      userId: task.assigneeId,
      skill: task.requiredSkill || 'General',
      rating: normalizedRating,
      feedback: feedback.trim(),
      ratedById: req.user.id,
      createdAt: new Date().toISOString()
    };

    db.insert('performance_ratings', ratingEntry);
    db.logActivity(req.user.id, 'PERFORMANCE_RATED', {
      taskId: task.id,
      assigneeId: task.assigneeId,
      rating: normalizedRating
    });

    res.status(201).json({
      message: 'Task performance successfully rated.',
      rating: ratingEntry
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record performance rating.' });
  }
});

// Get user performance history & summary (R6.4)
router.get('/user/:userId', authenticate, (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const ratings = db.filter('performance_ratings', r => r.userId === userId);
    const completedTasks = db.filter('tasks', t => t.assigneeId === userId && t.status === 'COMPLETED');

    const counts = {
      ABOVE_AVERAGE: 0,
      AVERAGE: 0,
      BELOW_AVERAGE: 0
    };
    ratings.forEach(r => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });

    // Breakdown by skill
    const skillBreakdown = {};
    ratings.forEach(r => {
      const s = r.skill || 'General';
      if (!skillBreakdown[s]) {
        skillBreakdown[s] = { total: 0, above: 0, avg: 0, below: 0 };
      }
      skillBreakdown[s].total++;
      if (r.rating === 'ABOVE_AVERAGE') skillBreakdown[s].above++;
      if (r.rating === 'AVERAGE') skillBreakdown[s].avg++;
      if (r.rating === 'BELOW_AVERAGE') skillBreakdown[s].below++;
    });

    res.json({
      userId: user.id,
      userName: user.name,
      totalCompletedTasks: completedTasks.length,
      totalRatedTasks: ratings.length,
      ratingCounts: counts,
      skillBreakdown,
      hasSufficientHistory: ratings.length >= 2,
      ratings
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve performance profile.' });
  }
});

export default router;

