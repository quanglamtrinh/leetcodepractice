#!/usr/bin/env python3
"""Test if the imported JSON is valid"""

import psycopg2
import json

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="leetcodepractice",
    user="leetcodeuser",
    password="leetcodepass"
)

cur = conn.cursor()

# Get a note with code block
cur.execute("""
    SELECT p.problem_id, p.title, up.notes
    FROM user_progress up
    JOIN problems p ON up.problem_id = p.id
    WHERE up.user_id = 3 AND p.problem_id = 412
""")

row = cur.fetchone()
if row:
    problem_id, title, notes = row
    print(f"Problem {problem_id}: {title}")
    print(f"\nNotes length: {len(notes)}")
    
    # Try to parse as JSON
    try:
        parsed = json.loads(notes)
        print("\n✓ JSON is VALID")
        
        # Find code blocks
        def find_code_blocks(obj, path=""):
            if isinstance(obj, dict):
                if obj.get('type') == 'codeBlock':
                    content = obj.get('content', [])
                    if content and isinstance(content, list):
                        text = content[0].get('text', '')
                        print(f"\n=== Code Block at {path} ===")
                        print(f"First 200 chars: {repr(text[:200])}")
                        print(f"Contains actual newline: {chr(10) in text}")
                        print(f"Contains literal \\n: {'\\n' in repr(text)}")
                
                for key, value in obj.items():
                    find_code_blocks(value, f"{path}.{key}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    find_code_blocks(item, f"{path}[{i}]")
        
        find_code_blocks(parsed)
        
    except json.JSONDecodeError as e:
        print(f"\n✗ JSON is INVALID: {e}")
        print(f"\nFirst 500 chars of notes:")
        print(repr(notes[:500]))

cur.close()
conn.close()
