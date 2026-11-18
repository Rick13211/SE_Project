import { db } from '../db.js';
import { nlpClient } from './nlpClient.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Intelligent Multi-Factor Task Allocation Engine (Requirement R7)
 * 
 * Mathematical Formulation:
 * Score(i) = w_skill * S_skill(i) 
 *            + w_perf * S_perf(i) 
 *            - w_load * (CurrentLoad(i) / MaxRefLoad) 
 *            + w_deadline * S_deadline(i)
 * 
 * Constraints:
 * - Minimum Warmup constraint (R6.5): Performance history is only applied if 
 *   completed tasks count >= 2; otherwise neutral score (1.0) is used.
 * - Deadline Feasibility (R7.4): Overloaded candidates with conflicting deadlines receive a penalty.
 */

const WEIGHTS = {
  skill: 0.40,
  performance: 0.25,
  workload: 0.25,
  deadline: 0.10
};

const RATING_MULTIPLIERS = {
  ABOVE_AVERAGE: 1.25,
  AVERAGE: 1.0,
  BELOW_AVERAGE: 0.75
};

export const getIntelligentRecommendations = async (taskId) => {
  const task = db.findById('tasks', taskId);
  if (!task) throw new Error('Task not found');

  const project = db.findById('projects', task.projectId);
  if (!project) throw new Error('Project not found');

  const candidates = db.filter('users', u => (project.memberIds || []).includes(u.id));
  if (candidates.length === 0) {
    throw new Error('No team members found in this project to allocate to.');
  }

  // 1. Compute NLP Skill Relevance via NLP Service
  const nlpBatchResults = await nlpClient.batchMatch(task, candidates);
  const nlpMap = {};
  (nlpBatchResults.rankings || []).forEach(r => {
    nlpMap[r.candidate_id] = r;
  });

  // Calculate maximum workload among team to normalize load factor
  let maxCurrentWorkload = 1;
  const memberMetrics = candidates.map(member => {
    const activeTasks = db.filter('tasks', t => t.assigneeId === member.id && t.status !== 'COMPLETED');
    const currentPoints = activeTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);
    if (currentPoints > maxCurrentWorkload) maxCurrentWorkload = currentPoints;

    // Completed tasks for performance tracking
    const completedTasks = db.filter('tasks', t => t.assigneeId === member.id && t.status === 'COMPLETED');
    const ratings = db.filter('performance_ratings', r => r.userId === member.id);

    // Skill-specific ratings
    const taskSkill = (task.requiredSkill || '').toLowerCase();
    const skillSpecificRatings = ratings.filter(r => (r.skill || '').toLowerCase() === taskSkill);

    // Warm-up constraint check (R6.5): at least 2 completed ratings
    let perfScore = 1.0;
    let hasSufficientHistory = ratings.length >= 2;
    if (hasSufficientHistory) {
      const targetRatings = skillSpecificRatings.length > 0 ? skillSpecificRatings : ratings;
      const sumMultipliers = targetRatings.reduce((sum, r) => sum + (RATING_MULTIPLIERS[r.rating] || 1.0), 0);
      perfScore = sumMultipliers / targetRatings.length;
    }

    // Deadline feasibility check:
    // Does the candidate already have tasks due around the same time?
    let deadlineFeasibility = 1.0;
    let conflictingTasksCount = 0;
    if (task.deadline) {
      const taskDue = new Date(task.deadline).getTime();
      const conflicts = activeTasks.filter(at => {
        if (!at.deadline) return false;
        const due = new Date(at.deadline).getTime();
        return Math.abs(due - taskDue) <= 24 * 60 * 60 * 1000 * 2; // within 2 days
      });
      conflictingTasksCount = conflicts.length;
      if (conflicts.length > 0) {
        deadlineFeasibility = Math.max(0.4, 1.0 - (conflicts.length * 0.2));
      }
    }

    return {
      member,
      currentPoints,
      activeTasksCount: activeTasks.length,
      completedCount: completedTasks.length,
      ratingsCount: ratings.length,
      hasSufficientHistory,
      perfScore: Number(perfScore.toFixed(2)),
      deadlineFeasibility: Number(deadlineFeasibility.toFixed(2)),
      conflictingTasksCount
    };
  });

  // Calculate Composite Final Score for each candidate
  const recommendations = memberMetrics.map(item => {
    const nlpInfo = nlpMap[item.member.id] || {
      relevance_score: 0.4,
      matched_skills: [],
      missing_skills: [],
      explanation: 'General match.'
    };

    const s_skill = nlpInfo.relevance_score; // 0.0 to 1.0
    const s_perf = item.perfScore;           // 0.75 to 1.25 (1.0 default)
    // Normalized load: scale to [0, 1] using dynamic cap (at least 10)
    const loadCap = Math.max(10, maxCurrentWorkload + 2);
    const s_load = Math.min(1.0, item.currentPoints / loadCap);
    const s_deadline = item.deadlineFeasibility; // 0.4 to 1.0

    // Weighted scoring
    const compositeScore = (
      (WEIGHTS.skill * s_skill) +
      (WEIGHTS.performance * (s_perf / 1.25)) -
      (WEIGHTS.workload * s_load) +
      (WEIGHTS.deadline * s_deadline)
    );

    // Normalize to 0-100 percentage for intuitive UI display
    const matchPercentage = Math.round(Math.max(15, Math.min(99, compositeScore * 100)));

    // Generate comprehensive reason narrative
    let reasonHighlights = [];
    if (nlpInfo.matched_skills && nlpInfo.matched_skills.length > 0) {
      reasonHighlights.push(`Matches skill: ${nlpInfo.matched_skills.join(', ')}`);
    }
    if (item.hasSufficientHistory) {
      const label = item.perfScore > 1.1 ? 'Strong historical track record' : (item.perfScore < 0.9 ? 'Needs improvement' : 'Consistent performer');
      reasonHighlights.push(label);
    } else {
      reasonHighlights.push('Neutral history (warmup phase)');
    }
    if (item.currentPoints <= 3) {
      reasonHighlights.push(`Light workload (${item.currentPoints} pts)`);
    } else if (item.currentPoints > 8) {
      reasonHighlights.push(`High current workload (${item.currentPoints} pts)`);
    }

    return {
      candidateId: item.member.id,
      candidateName: item.member.name,
      candidateEmail: item.member.email,
      matchPercentage,
      compositeScore: Number(compositeScore.toFixed(3)),
      metrics: {
        skillRelevance: s_skill,
        performanceMultiplier: item.perfScore,
        currentWorkloadPoints: item.currentPoints,
        activeTasksCount: item.activeTasksCount,
        hasSufficientHistory: item.hasSufficientHistory,
        deadlineFeasibility: item.deadlineFeasibility
      },
      nlpDetails: {
        matchedSkills: nlpInfo.matched_skills || [],
        missingSkills: nlpInfo.missing_skills || [],
        explanation: nlpInfo.explanation
      },
      recommendationReason: reasonHighlights.join(' | ')
    };
  });

  // Sort descending by composite score
  recommendations.sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskEffort: task.effortPoints || 1,
    requiredSkill: task.requiredSkill,
    recommendations,
    bestCandidate: recommendations[0] || null
  };
};

export const applyIntelligentAssignment = async (taskId, assigneeId, approvedByUserId, overrideReason = null) => {
  const task = db.findById('tasks', taskId);
  if (!task) throw new Error('Task not found');

  const assignee = db.findById('users', assigneeId);
  if (!assignee) throw new Error('Assignee user not found');

  const isOverride = !!overrideReason;
  const prevAssigneeId = task.assigneeId;

  // Update task
  const updatedTask = db.update('tasks', taskId, {
    assigneeId,
    allocationType: isOverride ? 'MANUAL_OVERRIDE' : 'INTELLIGENT_AI',
    assignedAt: new Date().toISOString()
  });

  // Log in Assignment History (R9.5)
  const historyEntry = {
    id: `hist_${uuidv4()}`,
    taskId,
    taskTitle: task.title,
    projectId: task.projectId,
    assigneeId,
    assigneeName: assignee.name,
    previousAssigneeId: prevAssigneeId || null,
    allocationType: isOverride ? 'MANUAL_OVERRIDE' : 'INTELLIGENT_AI',
    assignedBy: approvedByUserId,
    reason: isOverride ? `Manual Override: ${overrideReason}` : 'Approved Intelligent AI recommendation.',
    timestamp: new Date().toISOString()
  };
  db.insert('assignment_history', historyEntry);

  db.logActivity(approvedByUserId, isOverride ? 'ASSIGNMENT_OVERRIDDEN' : 'INTELLIGENT_ASSIGNMENT_APPROVED', {
    taskId,
    assigneeId,
    isOverride
  });

  return {
    success: true,
    task: updatedTask,
    historyEntry
  };
};

