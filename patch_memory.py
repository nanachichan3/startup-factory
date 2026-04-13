import re

with open('main.py', 'r') as f:
    content = f.read()

# Remove the graph_store entry (neo4j)
content = re.sub(
    r',?\n?\s*"graph_store":\s*\{[^}]+\},?',
    '',
    content,
    flags=re.DOTALL
)

# Remove the entire vector_store section and replace with chroma
content = re.sub(
    r'"vector_store":\s*\{[^}]+\},?',
    '"vector_store": {"provider": "chroma", "config": {"path": "/app/chroma_data", "collection_name": "memories"}},',
    content,
    flags=re.DOTALL
)

with open('main.py', 'w') as f:
    f.write(content)
print('Patched: removed graph_store, replaced vector_store with chroma (local)')
