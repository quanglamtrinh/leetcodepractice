const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function importProblems() {
  try {
    const csvPath = path.join(__dirname, '../../leetcode_comprehensive.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath);
      process.exit(1);
    }

    console.log('📂 Reading CSV file...');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('📊 Headers:', headers);
    console.log(`📝 Total lines: ${lines.length - 1}`);

    let imported = 0;
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      try {
        await pool.query(`
          INSERT INTO problems (problem_id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          parseInt(row.problem_id) || null,
          row.title || '',
          row.concept || '',
          row.difficulty || 'Medium',
          parseFloat(row.acceptance_rate) || null,
          parseInt(row.popularity) || null,
          row.leetcode_link || ''
        ]);
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`✅ Imported ${imported} problems...`);
        }
      } catch (err) {
        failed++;
        if (failed <= 5) {
          console.error(`❌ Failed to import: ${row.title}`, err.message);
        }
      }
    }

    console.log(`\n🎉 Import complete!`);
    console.log(`✅ Successfully imported: ${imported} problems`);
    console.log(`❌ Failed: ${failed} problems`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  }
}

importProblems();
