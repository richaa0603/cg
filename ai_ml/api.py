"""Production FastAPI service for Consultant Copilot AI engine."""
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


# ── Request DTO ───────────────────────────────────────────────────────────────

class RequirementRequest(BaseModel):
    requirement: str = Field(..., min_length=3)


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
    title="Consultant Copilot AI API",
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
    return {"status": "ok", "service": "consultant-copilot-ai"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
