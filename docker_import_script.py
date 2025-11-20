import psycopg2
import json
from datetime import datetime

conn = psycopg2.connect(dbname='leetcodepractice', user='leetcodeuser', password='1', host='localhost')
cursor = conn.cursor()

cursor.execute("SELECT id FROM users WHERE email = 'quanglam180903@gmail.com'")
user = cursor.fetchone()
if not user:
    print("User not found!")
    exit(1)

user_id = user[0]
print(f"User ID: {user_id}")

with open('/tmp/leetcodepractice', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = None
for i, line in enumerate(lines):
    if line.startswith('COPY public.problems ('):
        start_idx = i + 1
        break

count_solved = 0
count_notes = 0
count_total = 0

for i in range(start_idx, len(lines)):
    line = lines[i].strip()
    if line == '\\.' or not line:
        break
    
    parts = line.split('\t')
    if len(parts) < 9:
        continue
    
    problem_id = int(parts[1])
    solved = parts[7] == 't'
    notes = None if parts[8] == '\\N' else parts[8]
    
    cursor.execute("""
        INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (problem_id) DO UPDATE SET title = EXCLUDED.title
        RETURNING id
    """, (problem_id, parts[2], parts[3], parts[4], parts[5], parts[6], parts[9] if len(parts) > 9 else None))
    
    db_id = cursor.fetchone()[0]
    count_total += 1
    
    if solved or notes:
        cursor.execute("""
            INSERT INTO user_progress (user_id, problem_id, solved, solved_at, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (user_id, problem_id) DO UPDATE SET
                solved = EXCLUDED.solved,
                solved_at = EXCLUDED.solved_at,
                notes = EXCLUDED.notes
        """, (user_id, db_id, solved, datetime.now() if solved else None, notes))
        if solved:
            count_solved += 1
        if notes:
            count_notes += 1

conn.commit()
print(f"Total problems: {count_total}")
print(f"Solved: {count_solved}")
print(f"With notes: {count_notes}")
cursor.close()
conn.close()
print("Done!")
