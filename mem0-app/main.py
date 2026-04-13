import os
import sys

from mem0 import Memory
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Mem0 Memory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Mem0
print("Initializing Mem0...")
try:
    config = {
        "vector_store": {"provider": "chroma", "config": {"path": "/tmp/chroma_data", "collection_name": "memories"}},
        "llm": {"provider": "openai", "config": {"api_key": os.environ.get("OPENAI_API_KEY", ""), "model": "gpt-4o-mini"}},
        "embedder": {"provider": "openai", "config": {"api_key": os.environ.get("OPENAI_API_KEY", ""), "model": "text-embedding-3-small"}},
    }
    memory_client = Memory.from_config(config)
    print("Mem0 initialized successfully!")
except Exception as e:
    import traceback
    print(f"Mem0 INIT FAILED: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    memory_client = None

@app.get("/")
async def root():
    return {"status": "ok", "service": "mem0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/memories")
async def add_memories(request: dict):
    messages = request.get("messages", [])
    user_id = request.get("user_id", "default")
    if not memory_client:
        return {"status": "error", "error": "Mem0 not initialized"}, 500
    try:
        result = memory_client.add(messages=messages, user_id=user_id)
        return {"status": "ok", "result": result}
    except Exception as e:
        import traceback
        error_msg = f"{e}"
        traceback.print_exc()
        return {"status": "error", "error": error_msg}, 500

@app.post("/search")
async def search_memories(request: dict):
    query = request.get("query", "")
    user_id = request.get("user_id", "default")
    limit = request.get("limit", 5)
    if not memory_client:
        return {"status": "error", "error": "Mem0 not initialized"}, 500
    try:
        results = memory_client.search(query=query, user_id=user_id, limit=limit)
        return {"status": "ok", "results": results}
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500

@app.post("/memories/all")
async def get_all_memories(request: dict):
    user_id = request.get("user_id", "default")
    limit = request.get("limit", 50)
    if not memory_client:
        return {"status": "error", "error": "Mem0 not initialized"}, 500
    try:
        results = memory_client.get_all(user_id=user_id, limit=limit)
        return {"status": "ok", "results": results}
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500

@app.post("/memories/delete")
async def delete_memory(request: dict):
    memory_id = request.get("memory_id", "")
    user_id = request.get("user_id", "default")
    if not memory_client:
        return {"status": "error", "error": "Mem0 not initialized"}, 500
    try:
        memory_client.delete(memory_id, user_id=user_id)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
