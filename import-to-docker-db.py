#!/usr/bin/env python3
"""
Import data to Docker database for user quanglam180903@gmail.com
"""

import psycopg2
import json
from datetime import datetime

# Docker database connection
DB_CONFIG = {
    'dbname': 'leetcodepractice',
    'user': 'leetcodeuser',
    'password': '1',
    'host': 'localhost',  # Docker exposes port 5432 to localhost
    'port': '5432'
}

def parse_postgres_copy_line(line):
    """Parse a line from PostgreSQL COPY format"""
    parts = line.strip().split('\t')
    result = []
    for part in parts:
        if part == '\\N':
            result.append(None)
        else:
            result.append(part)
    return result

def parse_json_notes(notes_str):
    """Parse notes field"""
    if not notes_str or notes_str == '\\N':
        return None
    
    try:
        notes_json = json.loads(notes_str)
        return json.dumps(notes_json, ensure_ascii=False)
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse notes as JSON: {e}")
        return notes_str

def import_problems(cursor, dump_file_path):
    """Import problems from dump file"""
    print("\n=== Importing Problems ===")
    
    with open(dump_file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the COPY public.problems line
    start_idx = None
    for i, line in enumerate(lines):
        if line.startswith('COPY public.problems ('):
            start_idx = i + 1
            break
    
    if start_idx is None:
        print("Could not find problems data in dump file")
        return {}
    
    # Parse problems data
    problems_map = {}
    count = 0
    
    for i in range(start_idx, len(lines)):
        line = lines[i].strip()
        if line == '\\.' or line == '':
            break
        
        parts = parse_postgres_copy_line(line)
        if len(parts) < 9:
            continue
        
        problem_id = int(parts[1])
        title = parts[2]
        concept = parts[3]
        difficulty = parts[4]
        acceptance_rate = parts[5]
        popularity = parts[6]
        solved = parts[7] == 't'
        notes = parse_json_notes(parts[8])
        leetcode_link = parts[9] if len(parts) > 9 else None
        solution = parts[10] if len(parts) > 10 else None
        
        problems_map[problem_id] = {
            'title': title,
            'concept': concept,
            'difficulty': difficulty,
            'acceptance_rate': acceptance_rate,
            'popularity': popularity,
            'solved': solved,
            'notes': notes,
            'leetcode_link': leetcode_link,
            'solution': solution
        }
        
        # Insert or update problem
        cursor.execute("""
            INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link, solution)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (problem_id) DO UPDATE SET
                title = EXCLUDED.title,
                concept = EXCLUDED.concept,
                difficulty = EXCLUDED.difficulty,
                acceptance_rate = EXCLUDED.acceptance_rate,
                popularity = EXCLUDED.popularity,
                leetcode_link = EXCLUDED.leetcode_link,
                solution = EXCLUDED.solution,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """, (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link, solution))
        
        db_id = cursor.fetchone()[0]
        problems_map[problem_id]['db_id'] = db_id
        count += 1
    
    print(f"Imported/Updated {count} problems")
    return problems_map

def import_user_progress(cursor, user_id, problems_map):
    """Import user progress for the user"""
    print(f"\n=== Importing User Progress for user_id={user_id} ===")
    
    count_solved = 0
    count_notes = 0
    count_total = 0
    
    for problem_id, problem_data in problems_map.items():
        db_id = problem_data.get('db_id')
        if not db_id:
            continue
        
        solved = problem_data['solved']
        notes = problem_data['notes']
        
        # Only insert if there's something to track
        if solved or notes:
            cursor.execute("""
                INSERT INTO user_progress (user_id, problem_id, solved, solved_at, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, problem_id) DO UPDATE SET
                    solved = EXCLUDED.solved,
                    solved_at = EXCLUDED.solved_at,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, db_id, solved, datetime.now() if solved else None, notes))
            
            count_total += 1
            if solved:
                count_solved += 1
            if notes:
                count_notes += 1
    
    print(f"Imported {count_total} user progress records")
    print(f"  - {count_solved} solved problems")
    print(f"  - {count_notes} problems with notes")

def main():
    print("=" * 80)
    print("Import Data to Docker Database for User 'quanglam180903@gmail.com'")
    print("=" * 80)
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✓ Connected to Docker database")
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        return
    
    try:
        # Get user ID
        cursor.execute("SELECT id, username, email FROM users WHERE email = 'quanglam180903@gmail.com'")
        user = cursor.fetchone()
        
        if not user:
            print("✗ User not found!")
            return
        
        user_id = user[0]
        print(f"✓ Found user: {user[1]} ({user[2]}) - ID: {user_id}")
        
        # Import problems
        problems_map = import_problems(cursor, 'leetcodepractice')
        
        # Import user progress
        import_user_progress(cursor, user_id, problems_map)
        
        # Commit
        conn.commit()
        
        print("\n" + "=" * 80)
        print("✓ Import completed successfully!")
        print("=" * 80)
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
