#!/usr/bin/env python3
"""
Script to extract and import all problems from backup file
Removes solved and notes columns to match new schema
"""

import re

def main():
    backup_file = 'leetcodepractice'
    output_file = 'all-problems-import.sql'
    
    print("Reading backup file...")
    with open(backup_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the COPY statement for problems table
    print("Extracting problems data...")
    # Find start of COPY block
    start_marker = 'COPY public.problems ('
    start_idx = content.find(start_marker)
    
    if start_idx == -1:
        print("❌ Could not find problems COPY statement")
        return
    
    # Find end marker (line with just \.)
    end_marker = '\n\\.\n'
    end_idx = content.find(end_marker, start_idx)
    
    if end_idx == -1:
        print("❌ Could not find end of COPY block")
        return
    
    copy_block = content[start_idx:end_idx + len(end_marker)]
    lines = copy_block.split('\n')
    
    print(f"Found {len(lines)-2} problem records")
    
    # New column list without solved and notes
    new_header = "COPY public.problems (id, problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link, solution, created_at, updated_at, similar_problems) FROM stdin;"
    
    processed_lines = [new_header]
    skipped = 0
    
    # Process each data line
    for i, line in enumerate(lines[1:], 1):
        if line.strip() in ['', '\\\\.']:
            processed_lines.append(line)
            continue
        
        # Split by tab
        fields = line.split('\t')
        
        if len(fields) < 14:
            print(f"⚠️  Skipping line {i}: insufficient fields ({len(fields)})")
            skipped += 1
            continue
        
        # Remove fields at index 7 (solved) and 8 (notes)
        # Original: id, problem_id, title, concept, difficulty, acceptance_rate, popularity, solved, notes, leetcode_link, solution, created_at, updated_at, similar_problems
        # New:      id, problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link, solution, created_at, updated_at, similar_problems
        new_fields = fields[:7] + fields[9:]
        processed_lines.append('\t'.join(new_fields))
    
    # Write to output file
    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write('\n'.join(processed_lines))
    
    total_records = len(processed_lines) - 2  # Exclude header and \.
    print(f"\n✅ Success!")
    print(f"   Total records: {total_records}")
    print(f"   Skipped: {skipped}")
    print(f"   Output: {output_file}")
    print(f"\nTo import:")
    print(f"   Get-Content {output_file} | docker exec -i leetcode-postgres psql -U leetcodeuser -d leetcodepractice")

if __name__ == '__main__':
    main()
