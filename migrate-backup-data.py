#!/usr/bin/env python3
"""
Script to migrate data from old backup to new schema
Extracts only compatible data (problems, concepts, techniques, goals, patterns)
"""

import re
import sys

def extract_copy_data(backup_file, table_name):
    """Extract COPY data for a specific table"""
    with open(backup_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find COPY statement for the table
    pattern = rf'COPY public\.{table_name} \([^)]+\) FROM stdin;(.*?)\\\\.'
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        return match.group(0)
    return None

def process_problems_data(copy_statement):
    """Remove solved and notes columns from problems COPY statement"""
    lines = copy_statement.split('\n')
    
    # First line is COPY command - need to remove solved and notes from column list
    header = lines[0]
    # Remove solved and notes from column list
    header = header.replace(', solved', '').replace(', notes', '')
    
    processed_lines = [header]
    
    # Process data lines
    for line in lines[1:]:
        if line.strip() == '\\.' or not line.strip():
            processed_lines.append(line)
            continue
            
        # Split by tab
        fields = line.split('\t')
        if len(fields) < 14:  # Skip invalid lines
            continue
        
        # Remove fields at index 7 (solved) and 8 (notes)
        # Fields: 0:id, 1:problem_id, 2:title, 3:concept, 4:difficulty, 5:acceptance_rate, 
        #         6:popularity, 7:solved, 8:notes, 9:leetcode_link, 10:solution, 
        #         11:created_at, 12:updated_at, 13:similar_problems
        new_fields = fields[:7] + fields[9:]  # Skip index 7 and 8
        processed_lines.append('\t'.join(new_fields))
    
    return '\n'.join(processed_lines)

def main():
    backup_file = 'leetcodepractice'
    output_file = 'import-data.sql'
    
    print("Extracting data from backup...")
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write("-- Migrated data from old backup\n")
        out.write("-- Compatible with new multi-user schema\n\n")
        
        # Extract and process problems
        print("Processing problems table...")
        problems_copy = extract_copy_data(backup_file, 'problems')
        if problems_copy:
            processed = process_problems_data(problems_copy)
            out.write("-- Problems data\n")
            out.write(processed)
            out.write("\n\n")
            print(f"✓ Problems data extracted")
        
        # Extract other tables as-is (they don't have user-specific data)
        for table in ['concepts', 'techniques', 'goals', 'patterns', 'template_basics', 'template_variants']:
            print(f"Processing {table} table...")
            copy_data = extract_copy_data(backup_file, table)
            if copy_data:
                out.write(f"-- {table.capitalize()} data\n")
                out.write(copy_data)
                out.write("\n\n")
                print(f"✓ {table} data extracted")
    
    print(f"\n✅ Migration complete! Output: {output_file}")
    print(f"\nTo import: docker exec -i leetcode-postgres psql -U leetcodeuser -d leetcodepractice < {output_file}")

if __name__ == '__main__':
    main()
