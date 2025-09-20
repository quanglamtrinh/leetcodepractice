import csv
import re
from typing import Dict, List, Optional, Tuple

def extract_problem_number(title: str) -> Optional[int]:
    """Extract LeetCode problem number from title."""
    # Since titles don't have numbers, we'll use a simple counter
    # In a real scenario, you'd need a mapping file or API
    return None  # We'll handle this differently

def normalize_difficulty(difficulty: str) -> str:
    """Normalize difficulty to match database enum values."""
    difficulty = difficulty.strip().lower()
    if difficulty in ['easy', 'medium', 'hard']:
        return difficulty
    # Handle variations
    if difficulty in ['e', '1']:
        return 'easy'
    elif difficulty in ['m', '2']:
        return 'medium'
    elif difficulty in ['h', '3']:
        return 'hard'
    return 'easy'  # default fallback

def clean_acceptance_rate(acceptance: str) -> Optional[float]:
    """Clean and convert acceptance rate to float."""
    if not acceptance or acceptance.strip() == '':
        return None
    
    # Remove % symbol and convert to float
    cleaned = acceptance.replace('%', '').strip()
    try:
        return float(cleaned)
    except ValueError:
        return None

def clean_popularity(popularity: str) -> Optional[int]:
    """Clean and convert popularity to integer."""
    if not popularity or popularity.strip() == '':
        return None
    
    try:
        return int(popularity)
    except ValueError:
        return None

def create_concept_mapping() -> Dict[str, str]:
    """Create mapping from concept names to concept_ids for the database."""
    concept_mapping = {
        'Two Pointers': 'two-pointers',
        'Sliding Window': 'sliding-window',
        'Binary Search': 'binary-search',
        'Dynamic Programming': 'dynamic-programming',
        'Backtracking': 'backtracking',
        'Graph Traversal': 'graph-traversal',
        'Tree Traversal': 'tree-traversal',
        'Greedy Algorithm': 'greedy',
        'Divide and Conquer': 'divide-conquer',
        'Hash Table': 'hash-table',
        'Arrays & Hashing': 'hash-table',
        'Linked List': 'linked-list',
        'Stack': 'stack',
        'Queue': 'queue',
        'Heap / Priority Queue': 'heap',
        'Trie': 'trie',
        'Union Find': 'union-find',
        'Math & Geometry': 'math',
        'Bit Manipulation': 'bit-manipulation',
        'Intervals': 'intervals',
        'Misc': 'misc'
    }
    return concept_mapping

def main():
    # File paths
    concepts_file = 'leetcode_divided_by_concepts.csv'
    questions_file = 'all-leetcode-questions.csv'
    links_file = 'leetcode_with_concepts_and_links.csv'
    output_file = 'leetcode_comprehensive.csv'
    
    print("Loading CSV data...")
    
    # Load concepts
    concept_map = {}
    with open(concepts_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row['Title'].strip()
            concept = row['Concept'].strip()
            concept_map[title] = concept
    
    # Load questions (difficulty, acceptance)
    qa_map = {}
    with open(questions_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row['Title'].strip()
            acceptance = row.get('Acceptance', '').strip()
            difficulty = row.get('Difficulty', '').strip()
            
            qa_map[title] = {
                'acceptance': clean_acceptance_rate(acceptance),
                'difficulty': normalize_difficulty(difficulty)
            }
    
    # Load popularity data from leetcode_master_with_popularity.csv
    popularity_map = {}
    popularity_file = 'leetcode_master_with_popularity.csv'
    try:
        with open(popularity_file, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = row['Title'].strip()
                popularity = row.get('popularity', '').strip()
                popularity_map[title] = clean_popularity(popularity)
        print(f"Loaded popularity data for {len(popularity_map)} problems")
    except FileNotFoundError:
        print(f"Warning: {popularity_file} not found. Popularity data will be null.")
    except Exception as e:
        print(f"Warning: Error loading popularity data: {e}")
    
    # Load links
    link_map = {}
    with open(links_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row['Title'].strip()
            link = row['LeetCode Link'].strip()
            link_map[title] = link
    
    # Create concept mapping
    concept_mapping = create_concept_mapping()
    
    print("Merging data...")
    
    # Merge and write output
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'problem_id', 'title', 'concept', 'concept_id', 'difficulty', 
            'acceptance_rate', 'popularity', 'leetcode_link'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        processed_count = 0
        skipped_count = 0
        
        for i, title in enumerate(concept_map, 1):
            # Use sequential numbering since we don't have LeetCode problem numbers
            problem_id = i
            
            # Get concept and map to concept_id
            concept = concept_map.get(title, '')
            concept_id = concept_mapping.get(concept, concept.lower().replace(' ', '-').replace('&', '').replace('/', '-'))
            
            # Get other data
            qa_data = qa_map.get(title, {})
            link = link_map.get(title, '')
            popularity = popularity_map.get(title)
            
            row = {
                'problem_id': problem_id,
                'title': title,
                'concept': concept,
                'concept_id': concept_id,
                'difficulty': qa_data.get('difficulty', 'easy'),
                'acceptance_rate': qa_data.get('acceptance'),
                'popularity': popularity,
                'leetcode_link': link
            }
            writer.writerow(row)
            processed_count += 1
    
    print(f"\nProcessing complete!")
    print(f"Processed: {processed_count} problems")
    print(f"Skipped: {skipped_count} problems")
    print(f"Output saved as: {output_file}")
    
    # Generate summary statistics
    print(f"\nSummary by difficulty:")
    difficulty_counts = {}
    concept_counts = {}
    
    with open(output_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            difficulty = row['difficulty']
            concept = row['concept']
            
            difficulty_counts[difficulty] = difficulty_counts.get(difficulty, 0) + 1
            concept_counts[concept] = concept_counts.get(concept, 0) + 1
    
    print("Difficulty distribution:")
    for diff, count in sorted(difficulty_counts.items()):
        print(f"  {diff.capitalize()}: {count}")
    
    print(f"\nTop concepts:")
    for concept, count in sorted(concept_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {concept}: {count}")

if __name__ == "__main__":
    main()
