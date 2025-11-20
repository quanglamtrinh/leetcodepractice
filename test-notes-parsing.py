#!/usr/bin/env python3
"""Test to see how notes are stored in the dump file"""

# Read a sample line with notes
with open('leetcodepractice', 'r', encoding='utf-8') as f:
    in_copy = False
    for line in f:
        if 'COPY public.problems' in line and 'FROM stdin' in line:
            in_copy = True
            continue
        
        if in_copy:
            if line.strip() == '\\.' or line.strip() == '\\.':
                break
            
            # Look for problem 412 which has code blocks
            if line.startswith('412\t'):
                parts = line.strip().split('\t')
                notes = parts[8] if len(parts) > 8 else None
                
                if notes:
                    print("=== RAW NOTES (first 500 chars) ===")
                    print(repr(notes[:500]))
                    print("\n=== CHECKING FOR NEWLINES ===")
                    print(f"Contains literal \\n: {'\\n' in notes}")
                    print(f"Contains actual newline: {chr(10) in notes}")
                    
                    # Find a code block section
                    if 'codeBlock' in notes:
                        idx = notes.find('codeBlock')
                        print(f"\n=== CODE BLOCK SECTION (chars {idx} to {idx+200}) ===")
                        print(repr(notes[idx:idx+200]))
                
                break
