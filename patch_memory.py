import re
with open('main.py', 'r') as f:
    content = f.read()
# Remove the graph_store entry from DEFAULT_CONFIG
content = re.sub(
    r'\"graph_store\":\s*\{[^}]+\"provider\": \"neo4j\"[^}]+\},?\n?',
    '',
    content,
    flags=re.DOTALL
)
with open('main.py', 'w') as f:
    f.write(content)
print('Patched main.py to remove neo4j graph_store')
