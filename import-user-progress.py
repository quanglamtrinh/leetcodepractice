#!/usr/bin/env python3
"""
Script to import user progress (solved problems and notes) from backup file
Maps old data to new multi-user schema for a specific user
"""

import re
import sys

def main():
    backup_file = 'leetcodepractice'
    output_file = 'user-progress-import.sql'
    target_user_email = 'quanglam'  # Change this to target user email
    
    print(f"Reading backup file: {backup_file}")
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: File '{backup_file}' not found")
        return
    
    # Find the COPY statement for problems table to get solved and notes data
    print("Extracting user progress data...")
    start_marker = 'COPY public.problems ('
    start_idx = content.find(start_marker)
    
    if start_idx == -1:
        print("❌ Could not find problems COPY statement")
        return
    
    # Find end marker
    end_marker = '\n\\.\n'
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx == -1:
        print("❌ Could not find end of COPY block")
        return
    
    copy_block = content[start_idx:end_idx + len(end_marker)]
    lines = copy_block.split('\n')
    
    # Parse header to find column indices
    header_line = lines[0]
    print(f"Header: {header_line}")
    
    # Expected columns: id, problem_id, title, concept, difficulty, acceptance_rate, popularity, solved, notes, leetcode_link, solution, created_at, updated_at, similar_problems
    # We need: id (problem_id in new schema), solved, notes
    
    sql_statements = []
    sql_statements.append("-- Import user progress for user: " + target_user_email)
    sql_statements.append("-- Get user ID")
    sql_statements.append("DO $$")
    sql_statements.append("DECLARE")
    sql_statements.append("  target_user_id BIGINT;")
    sql_statements.append("BEGIN")
    sql_statements.append(f"  -- Get user ID for {target_user_email}")
    sql_statements.append(f"  SELECT id INTO target_user_id FROM users WHERE email LIKE '%{target_user_email}%' LIMIT 1;")
    sql_statements.append("")
    sql_statements.append("  IF target_user_id IS NULL THEN")
    sql_statements.append(f"    RAISE EXCEPTION 'User with email containing {target_user_email} not found';")
    sql_statements.append("  END IF;")
    sql_statements.append("")
    sql_statements.append("  RAISE NOTICE 'Importing progress for user ID: %', target_user_id;")
    sql_statements.append("")
    
    processed = 0
    skipped = 0
    solved_count = 0
    
    # Process each data line
    for i, line in enumerate(lines[1:], 1):
        if line.strip() in ['', '\\\\.']:
            continue
        
        # Split by tab
        fields = line.split('\t')
        
        if len(fields) < 14:
            print(f"⚠️  Skipping line {i}: insufficient fields ({len(fields)})")
            skipped += 1
            continue
        
        # Extract fields
        # 0: id, 1: problem_id, 2: title, 3: concept, 4: difficulty, 5: acceptance_rate, 6: popularity
        # 7: solved, 8: notes, 9: leetcode_link, 10: solution, 11: created_at, 12: updated_at, 13: similar_problems
        problem_id = fields[0]  # This is the problem ID
        solved = fields[7]  # 't' or 'f'
        notes = fields[8] if fields[8] != '\\N' else ''
        
        # Only import if solved or has notes
        if solved == 't' or (notes and notes != '\\N'):
            solved_bool = 'TRUE' if solved == 't' else 'FALSE'
            
            # Escape single quotes in notes
            notes_escaped = notes.replace("'", "''") if notes and notes != '\\N' else ''
            
            # Generate INSERT statement
            sql_statements.append(f"  -- Problem ID: {problem_id}")
            sql_statements.append(f"  INSERT INTO user_progress (user_id, problem_id, solved, notes, solved_at, updated_at)")
            sql_statements.append(f"  VALUES (target_user_id, {problem_id}, {solved_bool}, " + 
                                 (f"'{notes_escaped}'" if notes_escaped else "NULL") + 
                                 f", " + ("CURRENT_TIMESTAMP" if solved == 't' else "NULL") + 
                                 f", CURRENT_TIMESTAMP)")
            sql_statements.append(f"  ON CONFLICT (user_id, problem_id) DO UPDATE")
            sql_statements.append(f"    SET solved = EXCLUDED.solved,")
            sql_statements.append(f"        notes = EXCLUDED.notes,")
            sql_statements.append(f"        solved_at = EXCLUDED.solved_at,")
            sql_statements.append(f"        updated_at = CURRENT_TIMESTAMP;")
            sql_statements.append("")
            
            processed += 1
            if solved == 't':
                solved_count += 1
    
    sql_statements.append(f"  RAISE NOTICE 'Imported % progress records (% solved)', {processed}, {solved_count};")
    sql_statements.append("END $$;")
    
    # Write to output file
    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write('\n'.join(sql_statements))
    
    print(f"\n✅ Success!")
    print(f"   Total records processed: {processed}")
    print(f"   Solved problems: {solved_count}")
    print(f"   Skipped: {skipped}")
    print(f"   Output: {output_file}")
    print(f"\nTo import:")
    print(f"   Get-Content {output_file} | docker exec -i leetcode-postgres psql -U leetcodeuser -d leetcodepractice")
    print(f"\nOr:")
    print(f"   docker exec -i leetcode-postgres psql -U leetcodeuser -d leetcodepractice < {output_file}")

if __name__ == '__main__':
    main()
