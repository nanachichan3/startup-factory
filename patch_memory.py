import re
with open('main.py', 'r') as f:
    content = f.read()

# Remove the entire graph_store entry from DEFAULT_CONFIG
content = re.sub(
    r',?\n?\s*"graph_store":\s*\{[^}]+\},?',
    '',
    content,
    flags=re.DOTALL
)

# Also comment out or remove the graph_store reference in the configure endpoint
with open('main.py', 'w') as f:
    f.write(content)
print('Patched main.py to remove graph_store')
