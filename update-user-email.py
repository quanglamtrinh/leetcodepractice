#!/usr/bin/env python3
"""
Update user email to correct email
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
    
    print("=" * 80)
    print("Updating User Email")
    print("=" * 80)
    
    # Check current user
    cursor.execute("SELECT id, username, email FROM users WHERE username = 'quanglam'")
    user = cursor.fetchone()
    
    if not user:
        print("\n✗ User 'quanglam' not found!")
        cursor.close()
        conn.close()
        return
    
    user_id = user[0]
    print(f"\n✓ Current user:")
    print(f"  ID: {user_id}")
    print(f"  Username: {user[1]}")
    print(f"  Email: {user[2]}")
    
    # Check user progress
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN solved = TRUE THEN 1 ELSE 0 END) as solved,
            SUM(CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END) as with_notes
        FROM user_progress
        WHERE user_id = %s
    """, (user_id,))
    stats = cursor.fetchone()
    print(f"\n✓ User has:")
    print(f"  Total progress records: {stats[0]}")
    print(f"  Solved problems: {stats[1]}")
    print(f"  Problems with notes: {stats[2]}")
    
    # Update email
    new_email = 'quanglam180903@gmail.com'
    print(f"\n{'=' * 80}")
    print(f"Updating email to: {new_email}")
    print(f"{'=' * 80}")
    
    response = input("\nProceed? (yes/no): ")
    if response.lower() != 'yes':
        print("Update cancelled.")
        cursor.close()
        conn.close()
        return
    
    try:
        cursor.execute("""
            UPDATE users 
            SET email = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, username, email
        """, (new_email, user_id))
        
        updated_user = cursor.fetchone()
        conn.commit()
        
        print(f"\n✓ Email updated successfully!")
        print(f"  ID: {updated_user[0]}")
        print(f"  Username: {updated_user[1]}")
        print(f"  Email: {updated_user[2]}")
        
        print("\n" + "=" * 80)
        print("✓ UPDATE COMPLETED!")
        print("=" * 80)
        print("\nYou can now login with:")
        print(f"  Email: {new_email}")
        print(f"  Password: password123")
        print("=" * 80)
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Update failed: {e}")
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
