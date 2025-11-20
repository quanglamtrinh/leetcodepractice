#!/usr/bin/env node
/**
 * Script to fix code blocks with literal \n in calendar_notes
 * Replaces \\n with actual line breaks in codeBlock content
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcodepractice',
  user: process.env.DB_USER || 'leetcodeuser',
  password: process.env.DB_PASSWORD,
});

async function fixCodeBlocks() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding calendar notes with code blocks...\n');
    
    // Get all calendar notes
    const result = await client.query(
      "SELECT id, note_date, content FROM calendar_notes WHERE content IS NOT NULL"
    );
    
    console.log(`Found ${result.rows.length} notes to check\n`);
    
    let fixedCount = 0;
    
    for (const row of result.rows) {
      try {
        const data = JSON.parse(row.content);
        
        // Check if it's a doc with content
        if (data.type !== 'doc' || !data.content) {
          continue;
        }
        
        let modified = false;
        
        // Recursively fix code blocks
        function fixCodeBlocks(node) {
          if (typeof node === 'object' && node !== null) {
            // If it's a codeBlock, fix the text content
            if (node.type === 'codeBlock' && Array.isArray(node.content)) {
              for (const item of node.content) {
                if (item.type === 'text' && typeof item.text === 'string') {
                  const original = item.text;
                  // Replace literal \n with actual line breaks
                  const fixed = original.replace(/\\n/g, '\n');
                  if (fixed !== original) {
                    item.text = fixed;
                    modified = true;
                    console.log(`  ✅ Fixed code block in note ${row.id} (${row.note_date})`);
                  }
                }
              }
            }
            
            // Recurse into nested content
            if (Array.isArray(node.content)) {
              for (const child of node.content) {
                fixCodeBlocks(child);
              }
            }
          }
        }
        
        fixCodeBlocks(data);
        
        if (modified) {
          // Update the database
          const newContent = JSON.stringify(data);
          await client.query(
            'UPDATE calendar_notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newContent, row.id]
          );
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing note ${row.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} notes with code blocks`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixCodeBlocks()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
