#!/usr/bin/env python3
"""
List all users in database with full details
"""

import psycopg2

DB_CONFIG = {
    'dbname': 'leetcodepractice',
    'user': 'leetcodeuser',
    'password': '1',
    'host': 'localhost',
    'port': '5432'
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    print("=" * 100)
    print("ALL USERS IN DATABASE")
    print("=" * 100)
    
    # Get all users with their progress stats
    cursor.execute("""
        SELECT 
            u.id, 
            u.username, 
            u.email, 
            u.created_at,
            u.last_login,
            COUNT(up.id) as progress_count,
            SUM(CASE WHEN up.solved = TRUE THEN 1 ELSE 0 END) as solved_count,
            SUM(CASE WHEN up.notes IS NOT NULL THEN 1 ELSE 0 END) as notes_count
        FROM users u
        LEFT JOIN user_progress up ON u.id = up.user_id
        GROUP BY u.id, u.username, u.email, u.created_at, u.last_login
        ORDER BY u.id
    """)
    
    users = cursor.fetchall()
    
    if not users:
        print("\nNo users found in database!")
    else:
        print(f"\nTotal users: {len(users)}\n")
        
        for i, user in enumerate(users, 1):
            print(f"{'─' * 100}")
            print(f"USER #{i}")
            print(f"{'─' * 100}")
            print(f"  ID:              {user[0]}")
            print(f"  Username:        {user[1]}")
            print(f"  Email:           {user[2]}")
            print(f"  Created:         {user[3]}")
            print(f"  Last Login:      {user[4] if user[4] else 'Never'}")
            print(f"  Progress Count:  {user[5]}")
            print(f"  Solved Problems: {user[6]}")
            print(f"  Notes Count:     {user[7]}")
            
            # Show sample solved problems for this user
            if user[6] and user[6] > 0:
                cursor.execute("""
                    SELECT p.problem_id, p.title, p.difficulty
                    FROM user_progress up
                    JOIN problems p ON up.problem_id = p.id
                    WHERE up.user_id = %s AND up.solved = TRUE
                    ORDER BY p.problem_id
                    LIMIT 5
                """, (user[0],))
                
                solved = cursor.fetchall()
                print(f"\n  Sample Solved Problems:")
                for prob in solved:
                    print(f"    - #{prob[0]}: {prob[1]} ({prob[2]})")
            print()
    
    cursor.close()
    conn.close()
    
    print("=" * 100)

if __name__ == '__main__':
    main()
