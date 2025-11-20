#!/usr/bin/env python3
"""
Migrate data from temporary user to correct user quanglam180903@gmail.com
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
    print("Migrating Data to Correct User")
    print("=" * 80)
    
    # Find the correct user
    cursor.execute("SELECT id, username, email FROM users WHERE email = 'quanglam180903@gmail.com'")
    correct_user = cursor.fetchone()
    
    if not correct_user:
        print("\n✗ User with email 'quanglam180903@gmail.com' not found!")
        print("  Available users:")
        cursor.execute("SELECT id, username, email FROM users")
        for user in cursor.fetchall():
            print(f"    ID {user[0]}: {user[1]} ({user[2]})")
        cursor.close()
        conn.close()
        return
    
    correct_user_id = correct_user[0]
    print(f"\n✓ Found correct user:")
    print(f"  ID: {correct_user_id}")
    print(f"  Username: {correct_user[1]}")
    print(f"  Email: {correct_user[2]}")
    
    # Find the temporary user
    cursor.execute("SELECT id, username, email FROM users WHERE email = 'quanglam@example.com'")
    temp_user = cursor.fetchone()
    
    if not temp_user:
        print("\n✗ Temporary user not found!")
        cursor.close()
        conn.close()
        return
    
    temp_user_id = temp_user[0]
    print(f"\n✓ Found temporary user:")
    print(f"  ID: {temp_user_id}")
    print(f"  Username: {temp_user[1]}")
    print(f"  Email: {temp_user[2]}")
    
    # Check existing data for correct user
    cursor.execute("""
        SELECT COUNT(*) FROM user_progress WHERE user_id = %s
    """, (correct_user_id,))
    existing_count = cursor.fetchone()[0]
    print(f"\n✓ Correct user currently has {existing_count} progress records")
    
    # Check data from temp user
    cursor.execute("""
        SELECT COUNT(*) FROM user_progress WHERE user_id = %s
    """, (temp_user_id,))
    temp_count = cursor.fetchone()[0]
    print(f"✓ Temporary user has {temp_count} progress records to migrate")
    
    if temp_count == 0:
        print("\n⚠ No data to migrate!")
        cursor.close()
        conn.close()
        return
    
    # Ask for confirmation
    print(f"\n{'=' * 80}")
    print("MIGRATION PLAN:")
    print(f"  1. Copy {temp_count} records from temp user (ID {temp_user_id})")
    print(f"  2. To correct user (ID {correct_user_id})")
    print(f"  3. Delete temporary user")
    print(f"{'=' * 80}")
    
    response = input("\nProceed with migration? (yes/no): ")
    if response.lower() != 'yes':
        print("Migration cancelled.")
        cursor.close()
        conn.close()
        return
    
    try:
        # Step 1: Update user_id in user_progress
        print("\n1. Migrating user_progress records...")
        cursor.execute("""
            UPDATE user_progress
            SET user_id = %s
            WHERE user_id = %s
            ON CONFLICT (user_id, problem_id) DO UPDATE SET
                solved = EXCLUDED.solved,
                solved_at = EXCLUDED.solved_at,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        """, (correct_user_id, temp_user_id))
        print(f"   ✓ Migrated {cursor.rowcount} records")
        
        # Step 2: Delete temporary user
        print("\n2. Deleting temporary user...")
        cursor.execute("DELETE FROM users WHERE id = %s", (temp_user_id,))
        print(f"   ✓ Deleted temporary user")
        
        # Commit transaction
        conn.commit()
        
        # Verify
        print("\n3. Verifying migration...")
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN solved = TRUE THEN 1 ELSE 0 END) as solved,
                SUM(CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END) as with_notes
            FROM user_progress
            WHERE user_id = %s
        """, (correct_user_id,))
        stats = cursor.fetchone()
        print(f"   ✓ Total progress records: {stats[0]}")
        print(f"   ✓ Solved problems: {stats[1]}")
        print(f"   ✓ Problems with notes: {stats[2]}")
        
        print("\n" + "=" * 80)
        print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
    
    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
