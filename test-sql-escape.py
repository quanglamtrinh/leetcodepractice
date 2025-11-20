#!/usr/bin/env python3
"""Test SQL escaping"""

# This is what Python reads from dump file
dump_value = 'while curr2:\\n    if curr1.val != curr2.val:\\n        return False'

print("=== WHAT PYTHON READS FROM DUMP ===")
print(f"repr: {repr(dump_value)}")
print(f"Length: {len(dump_value)}")
print(f"Bytes: {dump_value.encode('utf-8').hex()}")

# Method 1: Just escape quotes
method1 = dump_value.replace("'", "''")
sql1 = f"'{method1}'"
print(f"\n=== METHOD 1: Just escape quotes ===")
print(f"SQL: {repr(sql1)}")

# What PostgreSQL will store
# When we write 'while curr2:\n' in SQL, PostgreSQL interprets \n as newline
# So it stores: while curr2:<actual newline>

# Method 2: Escape backslashes
method2 = dump_value.replace("\\", "\\\\").replace("'", "''")
sql2 = f"'{method2}'"
print(f"\n=== METHOD 2: Escape backslashes ===")
print(f"SQL: {repr(sql2)}")

# What PostgreSQL will store
# When we write 'while curr2:\\n' in SQL, PostgreSQL stores: while curr2:\n
# This is correct for JSON!

print("\n=== WHAT WE WANT IN DATABASE ===")
print("For JSON to work, we need: while curr2:\\n (backslash-n)")
print("So we should use METHOD 2")
