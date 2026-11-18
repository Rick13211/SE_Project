import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Team member requests reassignment (R9.3)
router.post('/request', authenticate, (req, res) => {
  try {
    const { taskId, reason } = req.body;

    if (!taskId || !reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'taskId and a justification reason are required.' });
    }

    const task = db.findById('tasks', taskId);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    if (task.assigneeId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only request reassignment for your own tasks.' });
    }

    // Check if pending request already exists
    const existing = db.findOne('reassignment_requests', r => r.taskId === taskId && r.status === 'PENDING');
    if (existing) {
      return res.status(400).json({ error: 'A reassignment request is already pending for this task.' });
    }

    const newRequest = {
      id: `reassign_${uuidv4()}`,
      taskId,
      taskTitle: task.title,
      projectId: task.projectId,
      requesterId: req.user.id,
      requesterName: req.user.name,
      reason: reason.trim(),
      status: 'PENDING', // PENDING, APPROVED, REJECTED
      createdAt: new Date().toISOString()
    };

    db.insert('reassignment_requests', newRequest);
    db.logActivity(req.user.id, 'REASSIGNMENT_REQUESTED', { taskId, reason });

    res.status(201).json({
      message: 'Reassignment request submitted for Team Lead review.',
      request: newRequest
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit reassignment request.' });
  }
});

// Team Lead views pending requests (R9.4)
router.get('/pending', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const requests = db.filter('reassignment_requests', r => r.status === 'PENDING');
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve reassignment requests.' });
  }
});

// Team Lead reviews (Approve or Reject) reassignment request (R9.4)
router.post('/:id/action', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const { action, reviewNotes = '' } = req.body; // 'APPROVE' or 'REJECT'
    const requestId = req.params.id;

    const request = db.findById('reassignment_requests', requestId);
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request already resolved with status ${request.status}.` });
    }

    const task = db.findById('tasks', request.taskId);
    if (!task) return res.status(404).json({ error: 'Associated task no longer exists.' });

    if (action === 'APPROVE') {
      // Unassign task so it can be re-allocated intelligently or manually
      const prevAssigneeId = task.assigneeId;
      db.update('tasks', task.id, {
        assigneeId: null,
        allocationType: null,
        status: 'TODO'
      });

      // Update request record
      db.update('reassignment_requests', requestId, {
        status: 'APPROVED',
        reviewedById: req.user.id,
        reviewNotes,
        resolvedAt: new Date().toISOString()
      });

      // Record in history log
      db.insert('assignment_history', {
        id: `hist_${uuidv4()}`,
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        assigneeId: null,
        previousAssigneeId: prevAssigneeId,
        allocationType: 'REASSIGNMENT_APPROVED',
        assignedBy: req.user.id,
        reason: `Reassignment approved. Reason provided by member: "${request.reason}". Lead note: "${reviewNotes}"`,
        timestamp: new Date().toISOString()
      });

      db.logActivity(req.user.id, 'REASSIGNMENT_APPROVED', { requestId, taskId: task.id });

      return res.json({
        message: 'Reassignment approved. Task is now unassigned and ready for re-allocation.'
      });
    } else if (action === 'REJECT') {
      db.update('reassignment_requests', requestId, {
        status: 'REJECTED',
        reviewedById: req.user.id,
        reviewNotes,
        resolvedAt: new Date().toISOString()
      });

      db.logActivity(req.user.id, 'REASSIGNMENT_REJECTED', { requestId, taskId: task.id, reviewNotes });

      return res.json({
        message: 'Reassignment request rejected. Task remains with current assignee.'
      });
    } else {
      return res.status(400).json({ error: 'Action must be either APPROVE or REJECT.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to process reassignment action.' });
  }
});

export default router;

