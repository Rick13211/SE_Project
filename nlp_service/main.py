"""
Smart Task Allocation - Python NLP Skill Matching Microservice
FastAPI service utilizing scikit-learn (TF-IDF Vectorization, Cosine Similarity, N-grams)
and an extensive software engineering skill taxonomy.
"""

import re
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(
    title="NLP Skill Matching & Extraction Service",
    description="Extracts technical skills and computes relevance scores for task allocation.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprehensive Software Engineering Skill Taxonomy
TAXONOMY = {
    # Programming Languages
    "python": ["python", "py", "python3"],
    "javascript": ["javascript", "js", "ecmascript", "es6"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "jvm", "jdk"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "csharp", "dotnet", ".net"],
    "go": ["golang", "go"],
    "rust": ["rust"],
    "php": ["php"],
    "ruby": ["ruby", "rails", "ruby on rails"],
    "swift": ["swift", "ios"],
    "kotlin": ["kotlin", "android"],
    "sql": ["sql", "rdbms", "database queries"],

    # Frontend Frameworks & Web
    "react": ["react", "react.js", "reactjs"],
    "next.js": ["next.js", "nextjs", "next"],
    "vue": ["vue", "vue.js", "vuejs"],
    "angular": ["angular", "angularjs"],
    "html/css": ["html", "html5", "css", "css3", "sass", "scss", "tailwind", "tailwindcss", "bootstrap"],
    "redux": ["redux", "zustand", "context api"],

    # Backend & APIs
    "node.js": ["node.js", "nodejs", "node"],
    "express": ["express", "express.js", "expressjs"],
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "spring boot": ["spring boot", "spring", "springboot"],
    "rest api": ["rest api", "rest", "restful", "restful api", "api integration", "web services"],
    "graphql": ["graphql", "apollo"],
    "grpc": ["grpc", "protobuf"],

    # Databases & Storage
    "mongodb": ["mongodb", "mongo", "nosql", "document database"],
    "postgresql": ["postgresql", "postgres", "psql"],
    "mysql": ["mysql", "mariadb"],
    "redis": ["redis", "in-memory cache", "caching"],
    "sqlite": ["sqlite", "sqlite3"],
    "elasticsearch": ["elasticsearch", "elastic search", "opensearch"],

    # DevOps, Cloud & Tools
    "docker": ["docker", "containerization", "containers", "dockerfile"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "azure": ["azure", "microsoft azure"],
    "git": ["git", "github", "gitlab", "version control"],
    "ci/cd": ["ci/cd", "continuous integration", "github actions", "jenkins", "devops"],
    "linux": ["linux", "bash", "shell scripting", "unix"],

    # Architecture & Core CS
    "microservices": ["microservices", "microservice architecture", "distributed systems"],
    "system design": ["system design", "architecture", "scalability", "high availability"],
    "security": ["security", "jwt", "oauth", "authentication", "authorization", "cryptography", "owasp"],
    "testing": ["unit testing", "integration testing", "jest", "pytest", "cypress", "selenium", "qa"],

    # AI / Data / NLP
    "nlp": ["nlp", "natural language processing", "spacy", "nltk", "transformers", "text mining", "text processing"],
    "machine learning": ["machine learning", "ml", "scikit-learn", "tensorflow", "pytorch", "deep learning", "ai"],
    "data science": ["data science", "pandas", "numpy", "data analysis", "visualization"]
}


def normalize_text(text: str) -> str:
    """Preprocesses text for NLP matching: lowercase, strip punct except valid tech symbols."""
    text = (text or "").lower()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    return text


def extract_skills_from_text(text: str) -> List[str]:
    """Extracts known technical skill entities from free text using taxonomy matching."""
    norm = normalize_text(text)
    matched = set()

    for canonical, aliases in TAXONOMY.items():
        for alias in aliases:
            # Word boundary matching to prevent matching 'go' in 'good' or 'c' in 'cat'
            pattern = r'(?<![a-zA-Z0-9#+])' + re.escape(alias) + r'(?![a-zA-Z0-9#+])'
            if re.search(pattern, norm):
                matched.add(canonical)
                break

    return sorted(list(matched))


def compute_similarity(profile_text: str, task_text: str, extracted_profile_skills: List[str], required_skills: List[str]) -> Dict:
    """
    Computes a hybrid Skill Relevance Score:
    1. Exact skill overlap (Jaccard similarity on extracted technical skill entities) - Weight: 60%
    2. Semantic TF-IDF Cosine Similarity on free-text descriptions - Weight: 40%
    """
    # 1. Entity Overlap
    profile_skills_set = set([s.lower() for s in extracted_profile_skills])
    req_skills_set = set([s.lower() for s in required_skills])

    if req_skills_set:
        matched_skills = profile_skills_set.intersection(req_skills_set)
        missing_skills = req_skills_set.difference(profile_skills_set)
        entity_score = len(matched_skills) / len(req_skills_set)
    else:
        matched_skills = set()
        missing_skills = set()
        entity_score = 0.5  # Neutral if no explicit required skill specified

    # 2. Free-text TF-IDF Vectorization & Cosine Similarity
    corpus = [profile_text or "general software developer", task_text or "general software engineering task"]
    try:
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(corpus)
        semantic_score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception:
        semantic_score = 0.0

    # Hybrid final relevance score (bounded [0.0, 1.0])
    if req_skills_set:
        final_score = round(0.65 * entity_score + 0.35 * min(1.0, semantic_score * 1.5), 3)
    else:
        final_score = round(min(1.0, semantic_score * 1.2), 3)

    final_score = max(0.05, min(1.0, final_score))

    # Human-readable explanation
    if len(matched_skills) > 0 and len(missing_skills) == 0:
        explanation = f"Excellent skill match! Covers all required skills ({', '.join(sorted(matched_skills))})."
    elif len(matched_skills) > 0:
        explanation = f"Good partial match. Matches {len(matched_skills)}/{len(req_skills_set)} required skills ({', '.join(sorted(matched_skills))})."
    elif semantic_score > 0.2:
        explanation = f"Contextual match based on profile domain keywords ({round(semantic_score * 100)}% text alignment)."
    else:
        explanation = "Low skill alignment with current task requirements."

    return {
        "relevance_score": final_score,
        "entity_score": round(entity_score, 3),
        "semantic_score": round(semantic_score, 3),
        "matched_skills": sorted(list(matched_skills)),
        "missing_skills": sorted(list(missing_skills)),
        "explanation": explanation
    }


# Models
class ExtractRequest(BaseModel):
    text: str

class MatchRequest(BaseModel):
    profile_text: str
    task_description: str
    required_skill: Optional[str] = None
    extra_required_skills: Optional[List[str]] = []

class CandidateInfo(BaseModel):
    id: str
    name: str
    profile_text: str
    skills: Optional[List[str]] = []
    current_workload_points: Optional[int] = 0
    performance_score: Optional[float] = 1.0
    completed_tasks_count: Optional[int] = 0

class BatchMatchRequest(BaseModel):
    task_title: str
    task_description: str
    required_skill: str
    effort_points: int
    deadline: Optional[str] = None
    candidates: List[CandidateInfo]


@app.get("/health")
def health():
    return {"status": "ok", "service": "NLP Skill Matching Service", "version": "1.0.0"}


@app.post("/extract-skills")
def extract_skills(req: ExtractRequest):
    extracted = extract_skills_from_text(req.text)
    return {
        "text_length": len(req.text),
        "extracted_skills": extracted,
        "count": len(extracted)
    }


@app.post("/match-skills")
def match_skills(req: MatchRequest):
    # Auto-extract from profile text if not already present
    extracted_profile = extract_skills_from_text(req.profile_text)
    
    # Consolidate required skills
    req_list = []
    if req.required_skill:
        req_list.append(req.required_skill.strip())
    if req.extra_required_skills:
        req_list.extend(req.extra_required_skills)
    
    # Also extract any explicit skills from task description
    task_extracted = extract_skills_from_text(req.task_description)
    combined_req = list(set([s.lower() for s in req_list + task_extracted]))

    result = compute_similarity(req.profile_text, req.task_description, extracted_profile, combined_req)
    result["extracted_profile_skills"] = extracted_profile
    result["identified_task_skills"] = combined_req
    return result


@app.post("/batch-match")
def batch_match(req: BatchMatchRequest):
    """Evaluates multiple candidates for a single task and computes NLP relevance."""
    task_full_text = f"{req.task_title}. {req.task_description}"
    task_extracted_skills = extract_skills_from_text(task_full_text)
    
    required = set()
    if req.required_skill:
        required.add(req.required_skill.strip().lower())
    for s in task_extracted_skills:
        required.add(s.lower())
    
    results = []
    for c in req.candidates:
        c_skills = list(set([s.lower() for s in (c.skills or [])] + extract_skills_from_text(c.profile_text)))
        match_data = compute_similarity(c.profile_text, task_full_text, c_skills, list(required))
        
        results.append({
            "candidate_id": c.id,
            "candidate_name": c.name,
            "relevance_score": match_data["relevance_score"],
            "matched_skills": match_data["matched_skills"],
            "missing_skills": match_data["missing_skills"],
            "explanation": match_data["explanation"],
            "extracted_skills": c_skills
        })

    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {
        "task_title": req.task_title,
        "required_skills": sorted(list(required)),
        "rankings": results
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

