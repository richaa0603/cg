"""Production FastAPI service for Gitlas AI engine."""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_ml.src.architecture import recommend_architecture
from ai_ml.src.components import recommend_components
from ai_ml.src.experts import recommend_experts
from ai_ml.src.risk_engine import recommend_risks
from ai_ml.src.search_engine import search_projects
from ai_ml.src.hybrid_search import search as hybrid_search


# ── Request DTOs ──────────────────────────────────────────────────────────────

class RequirementRequest(BaseModel):
    requirement: str = Field(..., min_length=3)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3)


# ── Search response models ────────────────────────────────────────────────────

class SearchResult(BaseModel):
    repositoryName: str
    source: str
    score: int
    language: str
    stars: int
    url: str
    matchedFiles: list[str]
    explanation: str
    matchedCapabilities: list[str]


class SearchResponse(BaseModel):
    results: list[SearchResult]


# ── Response models ───────────────────────────────────────────────────────────

class SimilarProject(BaseModel):
    repository: str
    score: int
    language: str
    stars: int
    url: str = ""


class Architecture(BaseModel):
    frontend: str
    backend: str
    database: str
    cloud: str


class Expert(BaseModel):
    name: str
    score: int


class FullAnalysis(BaseModel):
    projects: list[SimilarProject]
    components: list[str]
    architecture: Architecture
    experts: list[Expert]
    risks: list[str]


# ── App setup ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def _lifespan(_app: FastAPI):
    yield


app = FastAPI(
    title="Gitlas AI API",
    description="Engineering knowledge discovery and recommendation engine.",
    version="1.0.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_project(raw: dict) -> SimilarProject:
    return SimilarProject(
        repository=raw.get("repository", ""),
        score=int(raw.get("score", 0)),
        language=raw.get("language", "Unknown"),
        stars=int(raw.get("stars", 0)),
        url=raw.get("url", raw.get("html_url", "")),
    )


def _to_arch(raw: dict) -> Architecture:
    return Architecture(
        frontend=raw.get("frontend", "React"),
        backend=raw.get("backend", ".NET"),
        database=raw.get("database", "PostgreSQL"),
        cloud=raw.get("cloud", "Azure"),
    )


def _to_expert(raw: dict) -> Expert:
    return Expert(name=raw.get("name", ""), score=int(raw.get("score", 0)))


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
def health():
    return {"status": "ok", "service": "gitlas-ai"}


@app.post("/copilot/search", response_model=list[SimilarProject], tags=["copilot"])
async def search(req: RequirementRequest):
    try:
        raw = await asyncio.to_thread(search_projects, req.requirement, 10)
        return [_to_project(r) for r in raw]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/copilot/components", response_model=list[str], tags=["copilot"])
async def components(req: RequirementRequest):
    try:
        return await asyncio.to_thread(recommend_components, req.requirement)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/copilot/architecture", response_model=Architecture, tags=["copilot"])
async def architecture(req: RequirementRequest):
    try:
        raw = await asyncio.to_thread(recommend_architecture, req.requirement)
        return _to_arch(raw)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/copilot/experts", response_model=list[Expert], tags=["copilot"])
async def experts(req: RequirementRequest):
    try:
        raw = await asyncio.to_thread(recommend_experts, req.requirement)
        return [_to_expert(e) for e in raw]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/copilot/risks", response_model=list[str], tags=["copilot"])
async def risks(req: RequirementRequest):
    try:
        return await asyncio.to_thread(recommend_risks, req.requirement)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/copilot/full-analysis", response_model=FullAnalysis, tags=["copilot"])
async def full_analysis(req: RequirementRequest):
    try:
        projects_raw, comps, arch_raw, exps_raw, risk_list = await asyncio.gather(
            asyncio.to_thread(search_projects, req.requirement, 10),
            asyncio.to_thread(recommend_components, req.requirement),
            asyncio.to_thread(recommend_architecture, req.requirement),
            asyncio.to_thread(recommend_experts, req.requirement),
            asyncio.to_thread(recommend_risks, req.requirement),
        )
        return FullAnalysis(
            projects=[_to_project(p) for p in projects_raw],
            components=comps,
            architecture=_to_arch(arch_raw),
            experts=[_to_expert(e) for e in exps_raw],
            risks=risk_list,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/search", response_model=SearchResponse, tags=["search"])
async def search(req: SearchRequest):
    """
    Hybrid search endpoint.

    Workflow:
      1. Expand query using OpenAI
      2. Search FAISS (top-50 candidates)
      3. Analyze repositories (heuristic NLP)
      4. Rerank using OpenAI
      5. Apply organisation-priority bonus
      6. Generate explanations for top-10
      7. Return top-10 results
    """
    try:
        raw_results = await hybrid_search(req.query)
        results = [
            SearchResult(
                repositoryName=r.get("repositoryName", ""),
                source=r.get("source", "GitHub"),
                score=int(r.get("score", 0)),
                language=r.get("language", "Unknown"),
                stars=int(r.get("stars", 0)),
                url=r.get("url", ""),
                matchedFiles=r.get("matchedFiles", []),
                explanation=r.get("explanation", ""),
                matchedCapabilities=r.get("matchedCapabilities", []),
            )
            for r in raw_results
        ]
        return SearchResponse(results=results)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
