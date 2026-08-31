# Consultant Copilot AI/ML Layer

This module builds an engineering knowledge discovery system for Consultant Copilot.

Input example:
- "Need an attendance management system"

Output:
- Top 10 similar GitHub repositories

This module uses:
- Python
- Pandas
- Scikit-Learn
- Sentence Transformers (`all-MiniLM-L6-v2`)
- FAISS

## Phase Outputs
- `data/repositories.json`
- `data/processed_repositories.json`
- `data/repository_metadata.json`
- `artifacts/repository_embeddings.npy`
- `artifacts/faiss_index.bin`

## Setup
```bash
pip install -r requirements.txt
```

## End-to-End Pipeline
```bash
python -m src.pipeline --seed-query "attendance management system" --query "attendance management system" --max-repos 1000
```

## Search API Usage
```python
from src.search_engine import search_projects

requirement = "Need Attendance Management System"
print(search_projects(requirement, top_k=10))
```
