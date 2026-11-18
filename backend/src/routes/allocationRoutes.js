import express from 'express';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { runBaselineAllocation } from '../services/baselineAllocation.js';
import { getIntelligentRecommendations, applyIntelligentAssignment } from '../services/intelligentAllocation.js';

const router = express.Router();

// Trigger Baseline Initial Allocation for a project (R4)
router.post('/baseline', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required.' });
    }

    const result = await runBaselineAllocation(projectId);
    res.json(result);
  } catch (err) {
    console.error('Baseline allocation error:', err);
    res.status(500).json({ error: err.message || 'Baseline allocation failed.' });
  }
});

// Get Intelligent Recommendation ranking for a task (R7)
router.get('/recommend/:taskId', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), async (req, res) => {
  try {
    const recommendations = await getIntelligentRecommendations(req.params.taskId);
    res.json(recommendations);
  } catch (err) {
    console.error('Recommendation generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate recommendations.' });
  }
});

// Apply assignment: Lead approves AI recommendation OR manually overrides (R9.1, R9.2)
router.post('/assign', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), async (req, res) => {
  try {
    const { taskId, assigneeId, overrideReason } = req.body;

    if (!taskId || !assigneeId) {
      return res.status(400).json({ error: 'taskId and assigneeId are required.' });
    }

    const result = await applyIntelligentAssignment(taskId, assigneeId, req.user.id, overrideReason);
    res.json({
      message: overrideReason ? 'Task manually assigned.' : 'AI recommendation approved and assigned.',
      ...result
    });
  } catch (err) {
    console.error('Assignment error:', err);
    res.status(500).json({ error: err.message || 'Failed to assign task.' });
  }
});

// View assignment history for a task or project (R4.5, R9.5)
router.get('/history/:taskId', authenticate, (req, res) => {
  try {
    const history = db.filter('assignment_history', h => h.taskId === req.params.taskId);
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve assignment history.' });
  }
});

export default router;

