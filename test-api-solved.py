#!/usr/bin/env python3
"""
Test API to check if solved problems are returned correctly
"""

import requests
import json

# First, login to get token
def login():
    url = 'http://localhost:3001/api/auth/login'
    data = {
        'email': 'quanglam@example.com',
        'password': 'password123'  # Default password from import script
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Login successful")
            print(f"  User: {result.get('user', {}).get('username')}")
            return result.get('token')
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error connecting to API: {e}")
        return None

def get_problems(token):
    url = 'http://localhost:3001/api/problems'
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            problems = response.json()
            print(f"\n✓ Got {len(problems)} problems from API")
            
            # Count solved
            solved_count = sum(1 for p in problems if p.get('solved') == True)
            print(f"  Solved problems: {solved_count}")
            
            # Show some solved problems
            solved_problems = [p for p in problems if p.get('solved') == True][:10]
            if solved_problems:
                print("\n  Sample solved problems:")
                for p in solved_problems:
                    print(f"    #{p.get('id')}: {p.get('title')} - solved_at: {p.get('solved_at')}")
            else:
                print("\n  ⚠ No solved problems found in API response!")
            
            return problems
        else:
            print(f"✗ Failed to get problems: {response.status_code}")
            print(f"  Response: {response.text}")
            return None
    except Exception as e:
        print(f"✗ Error: {e}")
        return None

def main():
    print("=" * 80)
    print("Testing API for Solved Problems")
    print("=" * 80)
    
    # Check if server is running
    try:
        response = requests.get('http://localhost:3001/api/health', timeout=2)
        print("✓ Server is running")
    except:
        print("✗ Server is not running! Please start the server first:")
        print("  cd server && npm start")
        return
    
    # Login
    token = login()
    if not token:
        print("\n⚠ Cannot test API without login token")
        print("  Make sure:")
        print("  1. Server is running (npm start)")
        print("  2. User 'quanglam' exists with password 'password123'")
        return
    
    # Get problems
    get_problems(token)
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
