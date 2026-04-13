import re

with open('main.py', 'r') as f:
    content = f.read()

# Find DEFAULT_CONFIG and replace it entirely
# This is a Python dict literal, not JSON, so we need to handle it as Python

# Strategy: Find the DEFAULT_CONFIG block and replace it
old_default_config = '''DEFAULT_CONFIG = {
    "version": "v1.1",
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "host": POSTGRES_HOST,
            "port": int(POSTGRES_PORT),
            "dbname": POSTGRES_DB,
            "user": POSTGRES_USER,
            "password": POSTGRES_PASSWORD,
            "collection_name": POSTGRES_COLLECTION_NAME,
        },
    },
    "graph_store": {
        "provider": "neo4j",
        "config": {"url": NEO4J_URI, "username": NEO4J_USERNAME, "password": NEO4J_PASSWORD},
    },
    "llm": {"provider": "openai", "config": {"api_key": OPENAI_API_KEY, "temperature": 0.2, "model": "gpt-4.1-nano-2025-04-14"}},
    "embedder": {"provider": "openai", "config": {"api_key": OPENAI_API_KEY, "model": "text-embedding-3-small"}},
    "history_db_path": HISTORY_DB_PATH,
}'''

new_default_config = '''DEFAULT_CONFIG = {
    "version": "v1.1",
    "vector_store": {"provider": "chroma", "config": {"path": "/app/chroma_data", "collection_name": "memories"}},
    "llm": {"provider": "openai", "config": {"api_key": OPENAI_API_KEY, "temperature": 0.2, "model": "gpt-4.1-nano-2025-04-14"}},
    "embedder": {"provider": "openai", "config": {"api_key": OPENAI_API_KEY, "model": "text-embedding-3-small"}},
    "history_db_path": HISTORY_DB_PATH,
}'''

if old_default_config in content:
    content = content.replace(old_default_config, new_default_config)
    print("Patched DEFAULT_CONFIG: replaced vector_store+graph_store with chroma")
else:
    print("WARNING: Could not find exact DEFAULT_CONFIG match, trying regex")
    # Fallback: use regex to remove graph_store
    content = re.sub(
        r'    "graph_store":\s*\{[^}]+\},\n',
        '',
        content
    )
    # Replace vector_store block
    content = re.sub(
        r'    "vector_store":\s*\{[\s\S]*?    \},\n',
        '    "vector_store": {"provider": "chroma", "config": {"path": "/app/chroma_data", "collection_name": "memories"}},\n',
        content
    )
    print("Applied regex fallback patch")

with open('main.py', 'w') as f:
    f.write(content)
