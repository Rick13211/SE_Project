const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8000';

// Fallback technical taxonomy in JS
const JS_SKILL_TAXONOMY = {
  python: ['python', 'py', 'python3'],
  javascript: ['javascript', 'js', 'es6', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs', 'next'],
  'node.js': ['node.js', 'nodejs', 'node'],
  express: ['express', 'express.js', 'expressjs'],
  fastapi: ['fastapi'],
  mongodb: ['mongodb', 'mongo', 'nosql'],
  postgresql: ['postgresql', 'postgres', 'psql'],
  sql: ['sql', 'mysql', 'sqlite'],
  docker: ['docker', 'containers', 'containerization'],
  kubernetes: ['kubernetes', 'k8s'],
  aws: ['aws', 'cloud', 'ec2', 's3'],
  'ci/cd': ['ci/cd', 'github actions', 'jenkins', 'devops'],
  git: ['git', 'github', 'gitlab'],
  'rest api': ['rest api', 'rest', 'restful', 'api design'],
  microservices: ['microservices', 'distributed systems'],
  testing: ['testing', 'unit tests', 'jest', 'pytest', 'cypress'],
  nlp: ['nlp', 'natural language processing', 'spacy', 'nltk', 'text mining'],
  'machine learning': ['machine learning', 'ml', 'scikit-learn', 'deep learning']
};

export const nlpClient = {
  async extractSkills(text) {
    try {
      const response = await fetch(`${NLP_SERVICE_URL}/extract-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[NLP Client] Python NLP microservice unreachable, activating built-in JS fallback.');
    }

    // Fallback Extractor
    const norm = (text || '').toLowerCase();
    const extracted = [];
    for (const [canonical, aliases] of Object.entries(JS_SKILL_TAXONOMY)) {
      for (const alias of aliases) {
        const regex = new RegExp(`(?<![a-zA-Z0-9#+])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9#+])`, 'i');
        if (regex.test(norm)) {
          extracted.push(canonical);
          break;
        }
      }
    }
    return {
      text_length: (text || '').length,
      extracted_skills: extracted,
      count: extracted.length,
      is_fallback: true
    };
  },

  async matchSkills(profileText, taskDescription, requiredSkill, extraRequiredSkills = []) {
    try {
      const response = await fetch(`${NLP_SERVICE_URL}/match-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_text: profileText,
          task_description: taskDescription,
          required_skill: requiredSkill,
          extra_required_skills: extraRequiredSkills
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[NLP Client] Microservice unreachable for match-skills, using fallback.');
    }

    // JS Fallback calculation
    const profileSkills = (await this.extractSkills(profileText)).extracted_skills;
    const reqSet = new Set([
      ...(requiredSkill ? [requiredSkill.toLowerCase().trim()] : []),
      ...extraRequiredSkills.map(s => s.toLowerCase().trim())
    ]);

    const matched = profileSkills.filter(s => reqSet.has(s.toLowerCase()));
    const missing = Array.from(reqSet).filter(s => !profileSkills.includes(s));
    
    let relevanceScore = reqSet.size > 0 ? (matched.length / reqSet.size) : 0.5;
    relevanceScore = Math.max(0.1, Math.min(1.0, relevanceScore));

    return {
      relevance_score: Number(relevanceScore.toFixed(3)),
      matched_skills: matched,
      missing_skills: missing,
      extracted_profile_skills: profileSkills,
      identified_task_skills: Array.from(reqSet),
      explanation: matched.length === reqSet.size && reqSet.size > 0
        ? `Direct skill alignment on ${matched.join(', ')}`
        : `Matches ${matched.length}/${reqSet.size} skills`,
      is_fallback: true
    };
  },

  async batchMatch(taskData, candidates) {
    try {
      const response = await fetch(`${NLP_SERVICE_URL}/batch-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_title: taskData.title,
          task_description: taskData.description || '',
          required_skill: taskData.requiredSkill || '',
          effort_points: taskData.effortPoints || 1,
          deadline: taskData.deadline || null,
          candidates: candidates.map(c => ({
            id: c.id,
            name: c.name,
            profile_text: c.bio || c.skillsText || (c.skills || []).join(', '),
            skills: c.skills || [],
            current_workload_points: c.currentWorkload || 0
          }))
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[NLP Client] Microservice batch-match unreachable, running JS batch match.');
    }

    // JS Fallback batch matcher
    const rankings = [];
    for (const c of candidates) {
      const match = await this.matchSkills(
        c.bio || (c.skills || []).join(', '),
        `${taskData.title} ${taskData.description || ''}`,
        taskData.requiredSkill
      );
      rankings.push({
        candidate_id: c.id,
        candidate_name: c.name,
        relevance_score: match.relevance_score,
        matched_skills: match.matched_skills,
        missing_skills: match.missing_skills,
        explanation: match.explanation,
        extracted_skills: match.extracted_profile_skills
      });
    }

    rankings.sort((a, b) => b.relevance_score - a.relevance_score);
    return {
      task_title: taskData.title,
      required_skills: [taskData.requiredSkill].filter(Boolean),
      rankings,
      is_fallback: true
    };
  }
};

