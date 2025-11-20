#!/bin/bash
# Import script to run inside Docker container

echo "=========================================="
echo "Importing data for quanglam180903@gmail.com"
echo "=========================================="

# Create Python script inside container
docker exec -i leetcode-postgres python3 << 'PYTHON_SCRIPT'
import psycopg2
import json
from datetime import datetime

DB_CONFIG = {
    'dbname': 'leetcodepractice',
    'user': 'leetcodeuser',
    'password': '1',
    'host': 'localhost',
    'port': '5432'
}

def parse_line(line):
    parts = line.strip().split('\t')
    return [None if p == '\\N' else p for p in parts]

def parse_json(s):
    if not s or s == '\\N':
        return None
    try:
        return json.dumps(json.loads(s), ensure_ascii=False)
    except:
        return s

conn = psycopg2.connect(**DB_CONFIG)
cursor = conn.cursor()

# Get user
cursor.execute("SELECT id FROM users WHERE email = 'quanglam180903@gmail.com'")
user = cursor.fetchone()
if not user:
    print("User not found!")
    exit(1)

user_id = user[0]
print(f"User ID: {user_id}")

# Read dump file
with open('/tmp/leetcodepractice', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find problems section
start_idx = None
for i, line in enumerate(lines):
    if line.startswith('COPY public.problems ('):
        start_idx = i + 1
        break

if not start_idx:
    print("Problems data not found!")
    exit(1)

# Import
problems_map = {}
count = 0

for i in range(start_idx, len(lines)):
    line = lines[i].strip()
    if line == '\\.' or not line:
        break
    
    parts = parse_line(line)
    if len(parts) < 9:
        continue
    
    problem_id = int(parts[1])
    solved = parts[7] == 't'
    notes = parse_json(parts[8])
    
    # Insert problem
    cursor.execute("""
        INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link, solution)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (problem_id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id
    """, (problem_id, parts[2], parts[3], parts[4], parts[5], parts[6], parts[9] if len(parts) > 9 else None, parts[10] if len(parts) > 10 else None))
    
    db_id = cursor.fetchone()[0]
    
    # Insert user progress if needed
    if solved or notes:
        cursor.execute("""
            INSERT INTO user_progress (user_id, problem_id, solved, solved_at, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id, problem_id) DO UPDATE SET
                solved = EXCLUDED.solved,
                solved_at = EXCLUDED.solved_at,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, db_id, solved, datetime.now() if solved else None, notes))
        count += 1

conn.commit()
print(f"Imported {count} user progress records")

# Verify
cursor.execute("""
    SELECT COUNT(*), SUM(CASE WHEN solved THEN 1 ELSE 0 END)
    FROM user_progress WHERE user_id = %s
""", (user_id,))
stats = cursor.fetchone()
print(f"Total: {stats[0]}, Solved: {stats[1]}")

cursor.close()
conn.close()
print("Done!")
PYTHON_SCRIPT

echo "=========================================="
echo "Import completed!"
echo "=========================================="
