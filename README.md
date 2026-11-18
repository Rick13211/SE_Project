# Smart Task Allocation and Team Workload Management System
> **An Intelligent Jira-Style Software Project Management Platform with NLP Skill-Matching & Balanced Workload Allocation**

Prepared in compliance with the **Software Project Management Plan (SPMP)** and **Software Requirements Specification (SRS)** guidelines.

**Team / Contributors:**
- **Anantam Aftab** (2406100) — *Frontend Architecture & UI/UX Engineering*
- **Shivam Saurabh** (2406154) — *Backend Microservices & Data Schema Engineering*
- **Golu Kumar** (2406132) — *Workload Balancing Algorithms, Analytics & Reliability Engineering*
- **Rick Roy** (2406150) — *NLP Microservice & Intelligent Recommendation Models*

---

## 👥 Team Member Contribution Breakdown

### 1. Anantam Aftab (2406100) — Frontend Architecture & UI/UX Engineering
- **Role-Based Single Page Application (SPA)**: Architected and built the modern, responsive web application (`backend/public/index.html`, `backend/public/app.js`, `backend/public/styles.css`) using Tailwind CSS and glassmorphic UI cards.
- **Team Member Kanban Workspace (R3.6, R8)**: Developed the interactive 4-stage Kanban board (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `COMPLETED`) with one-click status transitions.
- **Workload Meters & Urgency Alerts (R8, R10)**: Designed personal effort-point progress bars and deadline urgency indicators warning developers when workloads exceed capacity ($> 8$ points).
- **Interactive NLP Skill Profile Editor (R5.1, R5.2)**: Implemented the developer bio editor with live "Test NLP Skill Extraction" preview that highlights extracted skills in real time.
- **Task Reassignment UI (R9.3)**: Built the member-facing modal to submit reassignment requests with mandatory justifications.
- **Evaluation Persona Switcher**: Integrated the 1-click persona bar in the header, allowing reviewers to jump between Team Lead, Developers, and Admin personas seamlessly.

### 2. Shivam Saurabh (2406154) — Backend Microservices & Data Schema Engineering
- **RESTful API Architecture & Routing**: Engineered the Node.js / Express 5 API modular routing architecture (`backend/src/routes/`), including `/api/auth`, `/api/projects`, `/api/tasks`, `/api/allocation`, `/api/reassignment`, `/api/performance`, `/api/users`, `/api/analytics`, and `/api/admin`.
- **Atomic Persistent Data Layer (ACID)**: Designed and implemented the database storage engine (`backend/src/db.js`) featuring atomic write/rename operations to guarantee data integrity across system restarts without external DBMS dependencies.
- **Authentication & RBAC Security (R1)**: Implemented JSON Web Token (JWT) tokenization, salted password hashing via `bcryptjs`, and role-checking middleware enforcing access boundaries across `ADMIN`, `TEAM_LEAD`, and `MEMBER`.
- **Task Lifecycle & Effort Point Model (R3)**: Implemented task CRUD controllers with effort level mapping ($\text{Low} = 1\text{ pt}$, $\text{Medium} = 3\text{ pts}$, $\text{High} = 5\text{ pts}$), priority flags, and assignment audit logging.
- **Database Seeder & Pre-population**: Authored `backend/scripts/seed.js` pre-populating realistic projects, tasks, user credentials, historical performance ratings, and initial assignment logs.

### 3. Golu Kumar (2406132) — Workload Balancing Algorithms, Analytics & Reliability Engineering
- **Baseline Fair Workload Allocation Engine (R4)**: Formulated and implemented the Stage 1 greedy bin-packing algorithm with uniform random tie-breaking $\mathcal{U}(M_{\min})$ (`backend/src/services/baselineAllocation.js`), equalizing effort points across members independently of skills to establish an unbiased performance benchmark.
- **Real-Time Project Workload Analytics (R10)**: Built the project workload aggregator (`backend/src/routes/analyticsRoutes.js`), computing member effort point distributions, active task breakdowns, and developer overload detection.
- **Reassignment Workflow Management (R9.3, R9.4, R9.5)**: Implemented the Team Lead reassignment review pipeline, allowing managers to approve or reject reassignment requests with feedback notes and updating immutable audit logs.
- **Express 5 Server Routing & Bug Resolution**: Resolved Express 5 / `path-to-regexp@8.x` routing conflicts by replacing bare wildcard paths with middleware-based catch-all request handlers.
- **End-to-End Integration Test Suite**: Developed the automated 6-step integration test runner (`test_suite.js`), validating relational integrity, baseline balancing, NLP extraction, recommendation scoring, and reassignment lifecycles.

### 4. Rick Roy (2406150) — NLP Microservice & Intelligent Recommendation Models
- **Python FastAPI NLP Microservice**: Developed the high-throughput NLP microservice (`nlp_service/main.py`) running on port 8000 using FastAPI, Uvicorn, and Pydantic.
- **Software Engineering Skill Taxonomy (R5.2)**: Curated a comprehensive taxonomy of 100+ technical competencies spanning Programming Languages, Web Frameworks, Databases, Cloud/DevOps, Testing, and AI/Data Science.
- **Hybrid Skill Relevance Matching (R5.4)**: Engineered the mathematical scoring algorithm combining exact taxonomy token matching with n-gram TF-IDF Cosine Similarity.
- **Stage 2 Multi-Factor Intelligent Allocation Recommender (R7)**: Formulated and implemented the recommendation equation (`backend/src/services/intelligentAllocation.js`) balancing skill alignment ($w_1 = 0.40$), performance multiplier ($w_2 = 0.25$), workload penalty ($w_3 = 0.25$), and deadline feasibility ($w_4 = 0.10$).
- **Performance Rating & Warm-Up Threshold (R6)**: Implemented the performance rating engine (`backend/src/routes/performanceRoutes.js`) storing `ABOVE_AVERAGE` ($1.25\times$), `AVERAGE` ($1.0\times$), and `BELOW_AVERAGE` ($0.75\times$) scores, enforcing the $\ge 2$ completed tasks warm-up constraint.
- **Zero-Downtime Fallback Client (R11.3)**: Built the resilient JavaScript NLP client (`backend/src/services/nlpClient.js`), ensuring automated fallback to built-in JS vectorization if the Python service is offline.

---

### 📊 Team Contribution & Responsibility Matrix

| Member Name | Roll Number | Primary Module | Requirements Owned | Key Code Artifacts |
|---|---|---|---|---|
| **Anantam Aftab** | 2406100 | Frontend SPA & UI/UX | R3.6, R5.1, R8, R9.3, R10 | `backend/public/index.html`, `app.js`, `styles.css` |
| **Shivam Saurabh** | 2406154 | Backend API & Data Schemas | R1, R2, R3, R9.5 | `backend/server.js`, `backend/src/db.js`, `auth.js`, `routes/`, `seed.js` |
| **Golu Kumar** | 2406132 | Baseline Allocation & Workload Analytics | R4, R9.4, R10, R11 | `backend/src/services/baselineAllocation.js`, `analyticsRoutes.js`, `test_suite.js` |
| **Rick Roy** | 2406150 | NLP Service & Multi-Factor Recommender | R5.2, R5.4, R6, R7, R11.3 | `nlp_service/main.py`, `intelligentAllocation.js`, `nlpClient.js`, `performanceRoutes.js` |

---

## 📌 Executive Architecture & System Overview

Traditional issue-tracking platforms (such as Jira or Trello) leave task delegation entirely to manual discretion, often resulting in skewed workloads, developer burnout, and mismatched technical skill assignments.

This platform introduces a dual-stage, mathematically balanced task allocation engine:
1. **Stage 1 (Baseline Balanced Random Allocation)**: Equalizes effort points across developers using greedy bin-packing and randomized tie-breaking independent of skills, establishing an unbiased performance benchmark.
2. **Stage 2 (Intelligent NLP Multi-Factor Recommender)**: Dynamically recommends optimal assignees by evaluating:
   - **NLP Skill Relevance** ($S_{skill}$): Free-text profile analysis, skill taxonomy mapping, and TF-IDF Cosine Similarity.
   - **Demonstrated Performance Track Record** ($S_{perf}$): Historical ratings (`Above Average`, `Average`, `Below Average`) with a warm-up threshold ($\ge 2$ ratings).
   - **Current Workload Pressure** ($S_{load}$): Active effort-point penalties preventing developer overloading.
   - **Deadline Feasibility** ($S_{deadline}$): Conflicting sprint commitments and delivery proximity checks.

```
+---------------------------------------------------------------------------------------+
|                                    WEB CLIENT (SPA)                                   |
|   Role-Based Dashboards: Team Lead (PM) | Team Member (Dev) | Administrator (Super)   |
|   Workload Meters | Real-Time Kanban Board | Reassignment Requests | AI Smart Modal   |
+-------------------------------------------+-------------------------------------------+
                                            | REST API (JSON / JWT)
                                            v
+---------------------------------------------------------------------------------------+
|                                NODE.JS / EXPRESS BACKEND                              |
|   - Authentication & Role Middleware (bcryptjs / JWT)                                 |
|   - Baseline Balanced Allocation Engine (Knapsack / Bin-Packing)                      |
|   - Intelligent Multi-Factor Decision Engine (R7 Formulation)                         |
|   - Assignment Audit Trail & Reassignment Workflow Engine                             |
+---------------------+-------------------------------------+---------------------------+
                      |                                     |
                      v                                     v
+------------------------------------+  +-----------------------------------------------+
|     DATA LAYER (Atomic ACID)       |  |          PYTHON NLP MICROSERVICE              |
|  - Users, Roles & Skill Profiles   |  |   - FastAPI / Uvicorn (Port 8000)             |
|  - Projects & Task Effort Points   |  |   - scikit-learn (TfidfVectorizer, Cosine)    |
|  - Performance Ratings (R6)        |  |   - 100+ Skill Taxonomy Tokenizer             |
|  - Assignment Audit Logs (R9.5)    |  |   - Automated JS Fallback for 100% Uptime     |
+------------------------------------+  +-----------------------------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18+ (tested on Node.js v22)
- **Python** 3.10+ (with `fastapi`, `uvicorn`, `scikit-learn` installed)

### 1. Launch Backend & Web Interface
From the project root directory (`d:\SE_Project`):
```bash
# Seed initial project data, users, and tasks
node backend/scripts/seed.js

# Start the full-stack server
node backend/server.js
```
The application will be live at:
👉 **http://localhost:5000**

### 2. (Optional) Launch Python NLP Microservice
To activate the external FastAPI NLP vectorizer service:
```bash
python nlp_service/main.py
```
*Note: If the Python microservice is not started, the backend automatically engages its built-in JavaScript TF-IDF & taxonomy NLP engine with zero downtime (satisfying Requirement R11.3: Graceful Failure Recovery).*

---

## 🔑 Pre-Configured Evaluation Personas (1-Click Login)

The web platform features **1-Click Persona Switching** in the top navigation bar for seamless evaluation:

| Role | Name | Email | Default Password | Primary Responsibilities |
|---|---|---|---|---|
| **Team Lead** | Alex Morgan | `lead@demo.com` | `password123` | Create projects/tasks, run baseline allocation, review AI recommendations, manage reassignments, rate completed work. |
| **Team Member** | Anantam Aftab | `anantam@demo.com` | `password123` | React/Next.js specialist, Kanban task progression, workload tracking, reassignment requests. |
| **Team Member** | Shivam Saurabh | `shivam@demo.com` | `password123` | Node.js/PostgreSQL specialist, update sprint tasks, maintain skills. |
| **Team Member** | Golu Kumar | `golu@demo.com` | `password123` | DevOps & Cloud specialist, Docker/K8s pipelines, workload tracking. |
| **Team Member** | Rick Roy | `rick@demo.com` | `password123` | NLP & AI engineer, evaluate NLP matches, update profile bio. |
| **Admin** | System Admin | `admin@demo.com` | `password123` | Manage user privileges, toggle active status, review immutable audit logs, export JSON reports. |

---

## 📐 Mathematical Formulation of Core Engines

### 1. Baseline Fair Workload Allocation (Requirement R4)
The baseline engine allocates unassigned tasks $T = \{t_1, t_2, \dots, t_n\}$ across team members $M = \{m_1, m_2, \dots, m_k\}$ to equalize active effort points:

$$\min \sum_{j=1}^{k} \left| W(m_j) - \bar{W} \right| \quad \text{where } \bar{W} = \frac{1}{k}\sum_{i=1}^{n} \text{effort}(t_i)$$

Tasks are shuffled to remove bias and allocated greedily to the member with the minimum instantaneous workload $\min_{j} W(m_j)$. Ties are resolved with uniform random selection $\mathcal{U}(M_{\min})$, guaranteeing **skill-independent benchmark parity**.

### 2. Hybrid NLP Skill Matching (Requirement R5)
The skill relevance score $S_{skill} \in [0.0, 1.0]$ blends exact taxonomy entity overlap with semantic n-gram TF-IDF Cosine Similarity:

$$S_{skill} = 0.65 \cdot \frac{| \text{Skills}_{cand} \cap \text{Skills}_{req} |}{| \text{Skills}_{req} |} + 0.35 \cdot \frac{\mathbf{v}_{cand} \cdot \mathbf{v}_{task}}{\|\mathbf{v}_{cand}\| \|\mathbf{v}_{task}\|}$$

### 3. Intelligent Multi-Factor Recommendation Engine (Requirement R7)
When suggesting the optimal assignee for task $t$, candidates are ranked by composite score:

$$\text{FinalScore}(u) = w_1 \cdot S_{skill}(u) + w_2 \cdot \frac{S_{perf}(u)}{1.25} - w_3 \cdot \frac{\text{Load}(u)}{\text{Cap}} + w_4 \cdot S_{deadline}(u)$$

**Weight Distribution:**
- $w_1 = 0.40$ (Technical Skill Alignment)
- $w_2 = 0.25$ (Historical Rating Multiplier: Above Avg = $1.25$, Avg = $1.0$, Below Avg = $0.75$)
- $w_3 = 0.25$ (Workload Penalty preventing bottlenecking)
- $w_4 = 0.10$ (Deadline Feasibility & schedule conflict damping)

*Warm-up Constraint (R6.5):* If a candidate has completed $< 2$ rated tasks, $S_{perf}$ defaults to neutral ($1.0$), ensuring new hires are not unfairly penalized.

---

## 🧪 Automated Test Suite Verification

Run the comprehensive end-to-end integration test suite:
```bash
node test_suite.js
```
**Test Coverage:**
- `TEST 1`: Database relational schema and model persistence
- `TEST 2`: NLP skill tokenization and extraction from free text
- `TEST 3`: Baseline balanced random allocation execution (R4)
- `TEST 4`: Intelligent multi-factor AI allocation ranking (R7)
- `TEST 5`: AI recommendation approval & immutable audit logging (R9.1, R9.5)
- `TEST 6`: Team member reassignment request & lead approval lifecycle (R9.3, R9.4)

---

## 📂 Codebase Directory Layout

```
d:\SE_Project\
├── backend\
│   ├── server.js                      # Express application entry & static SPA serving
│   ├── src\
│   │   ├── db.js                      # Persistent atomic database storage engine
│   │   ├── middleware\auth.js         # JWT verification & RBAC authorization
│   │   ├── services\
│   │   │   ├── baselineAllocation.js  # R4 Baseline workload balancer
│   │   │   ├── intelligentAllocation.js # R7 Intelligent multi-factor AI recommender
│   │   │   └── nlpClient.js           # FastAPI bridge + JS fallback engine
│   │   └── routes\                    # REST route controllers (Auth, Tasks, Projects, etc.)
│   ├── public\                        # Responsive Modern Single-Page Application
│   │   ├── index.html                 # App shell with Tailwind CSS & Lucide styling
│   │   ├── styles.css                 # Glassmorphism cards & workload meters
│   │   └── app.js                     # Modular client-side controller & Kanban board
│   └── scripts\seed.js                # Database seeder with realistic teams & ratings
├── nlp_service\
│   ├── main.py                        # FastAPI scikit-learn NLP microservice (Port 8000)
│   └── requirements.txt               # Python microservice dependencies
├── test_suite.js                      # Automated 6-step integration test runner
└── README.md                          # Comprehensive documentation & SPMP/SRS guide
```

---

## 📋 Software Requirements Specification (SRS) Compliance Matrix

| Requirement | Description | Lead Member | Implementation Status |
|---|---|---|---|
| **R1** | User Registration & Role-Based Auth | Shivam Saurabh | ✅ Implemented (JWT, bcryptjs hashing, RBAC middleware) |
| **R2** | Project & Team Management | Shivam Saurabh | ✅ Implemented (CRUD projects, add/remove members, stats) |
| **R3** | Task Management (Effort, Priority, Deadlines) | Shivam & Anantam | ✅ Implemented (Low=1pt, Med=3pt, High=5pt, Status flow) |
| **R4** | Initial Baseline Allocation | Golu Kumar | ✅ Implemented (Greedy bin-packing, randomized equalized load) |
| **R5** | NLP Skill Profile & Taxonomy Matching | Rick Roy | ✅ Implemented (FastAPI microservice + JS fallback, TF-IDF) |
| **R6** | Performance Tracking (Historical Ratings) | Rick Roy | ✅ Implemented (Above/Avg/Below, warm-up threshold of 2 tasks) |
| **R7** | Intelligent Task Allocation Recommendation | Rick Roy | ✅ Implemented (Multi-factor equation, ranked candidate fit %) |
| **R8** | Role-Based Dashboards | Anantam Aftab | ✅ Implemented (Team Lead Center, Member Kanban, Admin console) |
| **R9** | Assignment Override & Reassignment Workflow | Golu & Anantam | ✅ Implemented (Member request, Lead review, Audit trail) |
| **R10** | Workload & Deadline Feasibility | Golu Kumar | ✅ Implemented (Live effort aggregation, overload warning > 8 pts) |
| **R11** | Error Handling & High Availability | Golu & Rick | ✅ Implemented (Resilient NLP fallback, atomic ACID storage) |

