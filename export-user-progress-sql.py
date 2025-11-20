#!/usr/bin/env python3
"""
Export user progress from local DB as SQL INSERT statements
Then can run in Docker DB
"""

import psycopg2

DB_CONFIG = {
    'dbname': 'leetcodepractice',
    'user': 'leetcodeuser',
    'password': '1',
    'host': 'localhost',
    'port': '5432'
}

def main():
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("-- SQL to import user progress for quanglam180903@gmail.com")
    print("-- Run this in Docker database")
    print()
    
    # Get user progress from local DB (user_id = 1)
    cursor.execute("""
        SELECT p.problem_id, up.solved, up.solved_at, up.notes
        FROM user_progress up
        JOIN problems p ON up.problem_id = p.id
        WHERE up.user_id = 1
        ORDER BY p.problem_id
    """)
    
    rows = cursor.fetchall()
    print(f"-- Found {len(rows)} user progress records")
    print()
    
    # Generate SQL
    print("-- Insert user progress for user_id = 3 (quanglam180903@gmail.com)")
    print("DO $$")
    print("DECLARE")
    print("    v_problem_db_id BIGINT;")
    print("    v_user_id BIGINT := 3;")
    print("BEGIN")
    
    for row in rows:
        problem_id, solved, solved_at, notes = row
        
        # Escape notes for SQL
        if notes:
            notes_escaped = notes.replace("'", "''").replace("\\", "\\\\")
        else:
            notes_escaped = None
        
        print(f"    -- Problem #{problem_id}")
        print(f"    SELECT id INTO v_problem_db_id FROM problems WHERE problem_id = {problem_id};")
        print(f"    IF v_problem_db_id IS NOT NULL THEN")
        print(f"        INSERT INTO user_progress (user_id, problem_id, solved, solved_at, notes)")
        
        solved_val = str(solved).lower()
        solved_at_val = 'NULL' if not solved_at else f"'{solved_at}'"
        notes_val = 'NULL' if not notes_escaped else f"'{notes_escaped}'"
        
        print(f"        VALUES (v_user_id, v_problem_db_id, {solved_val}, {solved_at_val}, {notes_val})")
        print(f"        ON CONFLICT (user_id, problem_id) DO UPDATE SET")
        print(f"            solved = EXCLUDED.solved,")
        print(f"            solved_at = EXCLUDED.solved_at,")
        print(f"            notes = EXCLUDED.notes;")
        print(f"    END IF;")
        print()
    
    print("END $$;")
    print()
    print("-- Verify")
    print("SELECT COUNT(*), SUM(CASE WHEN solved THEN 1 ELSE 0 END) as solved_count")
    print("FROM user_progress WHERE user_id = 3;")
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
