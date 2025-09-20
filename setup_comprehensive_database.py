#!/usr/bin/env python3
"""
Comprehensive LeetCode Database Setup Script

This script prepares all the data needed for the comprehensive database schema:
1. Merges CSV data into the comprehensive format
2. Generates reference data SQL for concepts, techniques, goals, and templates
3. Provides instructions for database setup

Usage:
    python setup_comprehensive_database.py
"""

import subprocess
import sys
import os
from pathlib import Path

def run_script(script_name: str, description: str) -> bool:
    """Run a Python script and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Script: {script_name}")
    print('='*60)
    
    try:
        result = subprocess.run([sys.executable, script_name], 
                              capture_output=True, text=True, check=True)
        print("STDOUT:")
        print(result.stdout)
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_name}:")
        print("STDOUT:")
        print(e.stdout)
        print("STDERR:")
        print(e.stderr)
        return False
    except FileNotFoundError:
        print(f"Script {script_name} not found!")
        return False

def check_required_files() -> bool:
    """Check if required input files exist."""
    required_files = [
        'leetcode_divided_by_concepts.csv',
        'all-leetcode-questions.csv', 
        'leetcode_with_concepts_and_links.csv'
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease ensure all required CSV files are in the current directory.")
        return False
    
    print("✅ All required files found!")
    return True

def main():
    print("🚀 Comprehensive LeetCode Database Setup")
    print("=" * 50)
    
    # Check required files
    if not check_required_files():
        return 1
    
    # Step 1: Merge CSV data
    if not run_script('merge_comprehensive_csvs.py', 'Merging CSV data for comprehensive database'):
        print("❌ Failed to merge CSV data")
        return 1
    
    # Step 2: Generate reference data
    if not run_script('generate_reference_data.py', 'Generating reference data SQL'):
        print("❌ Failed to generate reference data")
        return 1
    
    # Check output files
    output_files = [
        'leetcode_comprehensive.csv',
        'reference_data.sql'
    ]
    
    print(f"\n{'='*60}")
    print("📋 Setup Complete!")
    print('='*60)
    
    for file in output_files:
        if Path(file).exists():
            size = Path(file).stat().st_size
            print(f"✅ {file} ({size:,} bytes)")
        else:
            print(f"❌ {file} (missing)")
    
    print(f"\n📝 Next Steps:")
    print("1. Set up your PostgreSQL database")
    print("2. Run the comprehensive schema:")
    print("   psql -d your_database -f comprehensive-schema.sql")
    print("3. Load the reference data:")
    print("   psql -d your_database -f reference_data.sql")
    print("4. Load the problems data:")
    print("   # You can use a CSV import tool or write a script to load leetcode_comprehensive.csv")
    
    print(f"\n📊 Database Schema Overview:")
    print("- problems: Main problems table with enhanced structure")
    print("- concepts: Problem categories (Two Pointers, DP, etc.)")
    print("- techniques: Solution techniques (Fast/Slow Pointers, etc.)")
    print("- goals: Problem objectives (Find Target, Optimize Path, etc.)")
    print("- patterns: Solution patterns linked to concepts")
    print("- variants: Pattern variations with specific techniques")
    print("- template_basics: Code templates for common patterns")
    print("- review_history: Spaced repetition tracking")
    print("- mistakes: Detailed mistake tracking")
    print("- problem_tags: Many-to-many relationships")
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
