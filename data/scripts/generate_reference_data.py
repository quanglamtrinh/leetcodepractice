import csv
from typing import Dict, List, Set

def generate_concepts_sql(concepts_file: str = 'leetcode_comprehensive.csv') -> str:
    """Generate SQL INSERT statements for concepts table."""
    concepts = set()
    
    # Read from the comprehensive CSV
    with open(concepts_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            concept = row['concept'].strip()
            concept_id = row['concept_id'].strip()
            if concept and concept_id:
                concepts.add((concept_id, concept))
    
    # Add default concepts from schema
    default_concepts = [
        ('two-pointers', 'Two Pointers'),
        ('sliding-window', 'Sliding Window'),
        ('binary-search', 'Binary Search'),
        ('dynamic-programming', 'Dynamic Programming'),
        ('backtracking', 'Backtracking'),
        ('graph-traversal', 'Graph Traversal'),
        ('tree-traversal', 'Tree Traversal'),
        ('greedy', 'Greedy Algorithm'),
        ('divide-conquer', 'Divide and Conquer'),
        ('hash-table', 'Hash Table'),
        ('linked-list', 'Linked List'),
        ('stack', 'Stack'),
        ('queue', 'Queue'),
        ('heap', 'Heap / Priority Queue'),
        ('trie', 'Trie'),
        ('union-find', 'Union Find'),
        ('math', 'Math & Geometry'),
        ('bit-manipulation', 'Bit Manipulation'),
        ('intervals', 'Intervals'),
        ('misc', 'Miscellaneous')
    ]
    
    for concept_id, concept_name in default_concepts:
        concepts.add((concept_id, concept_name))
    
    sql = "-- Insert concepts\n"
    sql += "INSERT INTO concepts (concept_id, name) VALUES\n"
    
    concept_list = sorted(list(concepts))
    for i, (concept_id, concept_name) in enumerate(concept_list):
        sql += f"    ('{concept_id}', '{concept_name}')"
        if i < len(concept_list) - 1:
            sql += ","
        sql += "\n"
    
    sql += "ON CONFLICT (concept_id) DO NOTHING;\n\n"
    return sql

def generate_techniques_sql() -> str:
    """Generate SQL INSERT statements for techniques table."""
    techniques = [
        ('Fast and Slow Pointers', 'Use two pointers moving at different speeds'),
        ('Left and Right Pointers', 'Use pointers from both ends moving towards center'),
        ('Sliding Window Fixed Size', 'Maintain a window of fixed size'),
        ('Sliding Window Variable Size', 'Expand and contract window based on conditions'),
        ('Binary Search on Answer', 'Use binary search to find optimal value'),
        ('Memoization', 'Cache results of expensive function calls'),
        ('Tabulation', 'Build up solution using iterative approach'),
        ('DFS Recursive', 'Depth-first search using recursion'),
        ('BFS Iterative', 'Breadth-first search using queue'),
        ('Backtrack with Pruning', 'Backtracking with early termination'),
        ('Two Pointers', 'Use two pointers to traverse array'),
        ('Hash Map', 'Use hash map for O(1) lookups'),
        ('Sorting', 'Sort the input to simplify the problem'),
        ('Greedy', 'Make locally optimal choices'),
        ('Divide and Conquer', 'Break problem into smaller subproblems'),
        ('Union Find', 'Use disjoint set data structure'),
        ('Trie', 'Use trie for string operations'),
        ('Monotonic Stack', 'Maintain stack with monotonic property'),
        ('Monotonic Queue', 'Maintain queue with monotonic property'),
        ('Prefix Sum', 'Use prefix sums for range queries'),
        ('Suffix Array', 'Use suffix arrays for string problems'),
        ('Segment Tree', 'Use segment tree for range queries'),
        ('Fenwick Tree', 'Use binary indexed tree for range queries'),
        ('Sliding Window', 'Maintain a sliding window'),
        ('Two Heaps', 'Use two heaps for median finding'),
        ('Topological Sort', 'Sort nodes in DAG'),
        ('Shortest Path', 'Find shortest path in graph'),
        ('Minimum Spanning Tree', 'Find MST using Kruskal or Prim'),
        ('Strongly Connected Components', 'Find SCCs using Tarjan or Kosaraju'),
        ('Eulerian Path', 'Find Eulerian path in graph')
    ]
    
    sql = "-- Insert techniques\n"
    sql += "INSERT INTO techniques (name, description) VALUES\n"
    
    for i, (name, description) in enumerate(techniques):
        sql += f"    ('{name}', '{description}')"
        if i < len(techniques) - 1:
            sql += ","
        sql += "\n"
    
    sql += "ON CONFLICT (name) DO NOTHING;\n\n"
    return sql

def generate_goals_sql() -> str:
    """Generate SQL INSERT statements for goals table."""
    goals = [
        ('Find Target', 'Locate a specific element or value'),
        ('Optimize Path', 'Find shortest or optimal path'),
        ('Count Occurrences', 'Count number of valid solutions'),
        ('Minimize Cost', 'Find solution with minimum cost'),
        ('Maximize Profit', 'Find solution with maximum benefit'),
        ('Detect Cycle', 'Identify cycles in data structure'),
        ('Validate Structure', 'Check if structure meets criteria'),
        ('Transform Data', 'Convert data from one form to another'),
        ('Partition Elements', 'Divide elements based on criteria'),
        ('Generate Combinations', 'Create all valid combinations'),
        ('Find Subarray', 'Find subarray with specific properties'),
        ('Merge Intervals', 'Merge overlapping intervals'),
        ('Find Duplicates', 'Identify duplicate elements'),
        ('Remove Elements', 'Remove elements based on criteria'),
        ('Rotate Array', 'Rotate array by k positions'),
        ('Reverse Elements', 'Reverse elements in place'),
        ('Find Missing', 'Find missing elements in sequence'),
        ('Calculate Sum', 'Calculate sum with constraints'),
        ('Find Maximum', 'Find maximum value with conditions'),
        ('Find Minimum', 'Find minimum value with conditions'),
        ('Check Palindrome', 'Verify if string/array is palindrome'),
        ('Find Peak', 'Find peak element in array'),
        ('Sort Array', 'Sort array with specific constraints'),
        ('Search Element', 'Search for element in sorted/unsorted array'),
        ('Validate Parentheses', 'Check if parentheses are balanced'),
        ('Find Common', 'Find common elements between arrays'),
        ('Calculate Distance', 'Calculate distance between elements'),
        ('Find Intersection', 'Find intersection of arrays/lists'),
        ('Generate Permutations', 'Generate all permutations'),
        ('Find Subsequence', 'Find subsequence with properties')
    ]
    
    sql = "-- Insert goals\n"
    sql += "INSERT INTO goals (name, description) VALUES\n"
    
    for i, (name, description) in enumerate(goals):
        sql += f"    ('{name}', '{description}')"
        if i < len(goals) - 1:
            sql += ","
        sql += "\n"
    
    sql += "ON CONFLICT (name) DO NOTHING;\n\n"
    return sql

def generate_template_basics_sql() -> str:
    """Generate SQL INSERT statements for template_basics table."""
    templates = [
        ('Two Pointers Template', 
         'def two_pointers(arr):\n    left, right = 0, len(arr) - 1\n    while left < right:\n        # Process current pair\n        if condition:\n            # Move pointers based on condition\n            left += 1\n        else:\n            right -= 1\n    return result'),
        
        ('Sliding Window Template',
         'def sliding_window(arr, k):\n    window_sum = sum(arr[:k])\n    max_sum = window_sum\n    \n    for i in range(k, len(arr)):\n        window_sum = window_sum - arr[i-k] + arr[i]\n        max_sum = max(max_sum, window_sum)\n    \n    return max_sum'),
        
        ('Binary Search Template',
         'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    \n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    \n    return -1'),
        
        ('DFS Template',
         'def dfs(node, visited):\n    if not node or node in visited:\n        return\n    \n    visited.add(node)\n    # Process current node\n    \n    for neighbor in node.neighbors:\n        dfs(neighbor, visited)'),
        
        ('BFS Template',
         'def bfs(start):\n    queue = [start]\n    visited = set([start])\n    \n    while queue:\n        node = queue.pop(0)\n        # Process current node\n        \n        for neighbor in node.neighbors:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)'),
        
        ('Backtracking Template',
         'def backtrack(path, choices):\n    if is_valid_solution(path):\n        result.append(path[:])\n        return\n    \n    for choice in choices:\n        if is_valid_choice(choice, path):\n            path.append(choice)\n            backtrack(path, remaining_choices)\n            path.pop()'),
        
        ('Dynamic Programming Template',
         'def dp_problem(n):\n    dp = [0] * (n + 1)\n    dp[0] = base_case\n    \n    for i in range(1, n + 1):\n        dp[i] = recurrence_relation(dp, i)\n    \n    return dp[n]'),
        
        ('Hash Map Template',
         'def hash_map_solution(arr):\n    count_map = {}\n    \n    for num in arr:\n        if num in count_map:\n            count_map[num] += 1\n        else:\n            count_map[num] = 1\n    \n    # Process based on counts\n    return result'),
        
        ('Sorting Template',
         'def sorting_solution(arr):\n    arr.sort()  # or arr.sort(key=lambda x: x.property)\n    \n    # Process sorted array\n    for i in range(len(arr)):\n        # Process each element\n        pass\n    \n    return result'),
        
        ('Greedy Template',
         'def greedy_solution(choices):\n    choices.sort(key=lambda x: x.priority)  # Sort by priority\n    \n    result = []\n    for choice in choices:\n        if is_valid_choice(choice, result):\n            result.append(choice)\n    \n    return result')
    ]
    
    sql = "-- Insert template basics\n"
    sql += "INSERT INTO template_basics (description, template_code) VALUES\n"
    
    for i, (description, template_code) in enumerate(templates):
        # Escape single quotes in template code
        escaped_code = template_code.replace("'", "''")
        sql += f"    ('{description}', '{escaped_code}')"
        if i < len(templates) - 1:
            sql += ","
        sql += "\n"
    
    sql += "ON CONFLICT DO NOTHING;\n\n"
    return sql

def generate_problems_sql(comprehensive_file: str = 'leetcode_comprehensive.csv') -> str:
    """Generate SQL INSERT statements for problems table."""
    sql = "-- Insert problems\n"
    sql += "INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link) VALUES\n"
    
    rows = []
    with open(comprehensive_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            problem_id = row['problem_id']
            title = row['title'].replace("'", "''")  # Escape single quotes
            concept = row['concept'].replace("'", "''") if row['concept'] else 'NULL'
            difficulty = row['difficulty']
            acceptance_rate = row['acceptance_rate'] if row['acceptance_rate'] else 'NULL'
            popularity = row['popularity'] if row['popularity'] else 'NULL'
            leetcode_link = row['leetcode_link'].replace("'", "''") if row['leetcode_link'] else 'NULL'
            
            rows.append(f"    ({problem_id}, '{title}', '{concept}', '{difficulty}', {acceptance_rate}, {popularity}, '{leetcode_link}')")
    
    sql += ",\n".join(rows)
    sql += "\nON CONFLICT (problem_id) DO NOTHING;\n\n"
    return sql

def main():
    print("Generating reference data SQL...")
    
    # Generate all SQL statements
    concepts_sql = generate_concepts_sql()
    techniques_sql = generate_techniques_sql()
    goals_sql = generate_goals_sql()
    templates_sql = generate_template_basics_sql()
    problems_sql = generate_problems_sql()
    
    # Combine all SQL
    full_sql = """-- Reference Data for Comprehensive LeetCode Database
-- This file contains INSERT statements for reference tables

""" + concepts_sql + techniques_sql + goals_sql + templates_sql + problems_sql
    
    # Write to file
    with open('reference_data.sql', 'w', encoding='utf-8') as f:
        f.write(full_sql)
    
    print("Reference data SQL generated successfully!")
    print("Files created:")
    print("  - reference_data.sql (SQL INSERT statements)")
    print("  - leetcode_comprehensive.csv (if not already exists)")

if __name__ == "__main__":
    main()
