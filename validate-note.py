#!/usr/bin/env python3
import json

with open('test-note-412.txt', 'r', encoding='utf-8') as f:
    notes = f.read()

print(f"Notes length: {len(notes)}")
print(f"\nFirst 300 chars:")
print(repr(notes[:300]))

try:
    parsed = json.loads(notes)
    print("\n✓ JSON is VALID!")
    
    # Find first code block
    def find_first_code_block(obj):
        if isinstance(obj, dict):
            if obj.get('type') == 'codeBlock':
                content = obj.get('content', [])
                if content and isinstance(content, list):
                    text = content[0].get('text', '')
                    return text
            for value in obj.values():
                result = find_first_code_block(value)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = find_first_code_block(item)
                if result:
                    return result
        return None
    
    code = find_first_code_block(parsed)
    if code:
        print(f"\n=== First Code Block ===")
        print(f"Length: {len(code)}")
        print(f"First 200 chars: {repr(code[:200])}")
        print(f"\nActual content:")
        print(code[:200])
        
except json.JSONDecodeError as e:
    print(f"\n✗ JSON INVALID: {e}")
