import os
import sys

# Capture startup errors
startup_errors = []

try:
    from mem0 import Memory
    from fastapi import FastAPI
    import uvicorn
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(title="Mem0 Memory API")
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize Mem0 with minimal config
    config = {
        "vector_store": {"provider": "chroma", "config": {"path": "/tmp/chroma_data", "collection_name": "memories"}},
        "llm": {"provider": "openai", "config": {"api_key": os.environ.get("OPENAI_API_KEY", ""), "model": "gpt-4o-mini"}},
        "embedder": {"provider": "openai", "config": {"api_key": os.environ.get("OPENAI_API_KEY", ""), "model": "text-embedding-3-small"}},
    }
    
    memory_client = Memory.from_config(config)
    print("Mem0 initialized successfully!")
    
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
        try:
            result = memory_client.add(messages=messages, user_id=user_id)
            return {"status": "ok", "result": result}
        except Exception as e:
            import traceback
            error_msg = str(e) + "\n" + traceback.format_exc()
            print(f"ERROR in add_memories: {error_msg}", file=sys.stderr)
            return {"status": "error", "error": str(e)}, 500
    
    @app.post("/search")
    async def search_memories(request: dict):
        query = request.get("query", "")
        user_id = request.get("user_id", "default")
        limit = request.get("limit", 5)
        try:
            results = memory_client.search(query=query, user_id=user_id, limit=limit)
            return {"status": "ok", "results": results}
        except Exception as e:
            print(f"ERROR in search: {e}", file=sys.stderr)
            return {"status": "error", "error": str(e)}, 500
    
    if __name__ == "__main__":
        uvicorn.run(app, host="0.0.0.0", port=5000)
        
except Exception as e:
    import traceback
    startup_errors.append(str(e))
    print(f"STARTUP ERROR: {e}", file=sys.stderr)
    print(traceback.format_exc(), file=sys.stderr)
    sys.stderr.flush()
    # Keep container alive for debugging
    import time
    time.sleep(36000)
