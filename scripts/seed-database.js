#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the database with LeetCode problems from CSV files
 */

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Find CSV file (prioritize comprehensive version)
    const csvFiles = [
      'leetcode_comprehensive.csv',
      'leetcode_master_with_popularity.csv',
      'leetcode_master.csv'
    ];

    let csvFile = null;
    for (const file of csvFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        csvFile = filePath;
        console.log(`📁 Using CSV file: ${file}\n`);
        break;
      }
    }

    if (!csvFile) {
      console.error('❌ No CSV file found. Please ensure a CSV file exists in the project root.');
      process.exit(1);
    }

    const problems = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csvParser())
        .on('data', (row) => {
          problems.push({
            id: parseInt(row.id || row.ID),
            title: row.title || row.Title,
            concept: row.concept || row.Concept,
            difficulty: row.difficulty || row.Difficulty,
            acceptance_rate: parseFloat(row.acceptance_rate || row['Acceptance Rate'] || 0),
            popularity: parseInt(row.popularity || row.Popularity || 0),
            leetcode_link: row.leetcode_link || row['LeetCode Link'] || row.link
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Parsed ${problems.length} problems from CSV\n`);

    // Insert problems into database
    let inserted = 0;
    let updated = 0;

    for (const problem of problems) {
      try {
        const query = `
          INSERT INTO problems (id, title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) 
          DO UPDATE SET 
            title = EXCLUDED.title,
            concept = EXCLUDED.concept,
            difficulty = EXCLUDED.difficulty,
            acceptance_rate = EXCLUDED.acceptance_rate,
            popularity = EXCLUDED.popularity,
            leetcode_link = EXCLUDED.leetcode_link,
            updated_at = CURRENT_TIMESTAMP
          RETURNING (xmax = 0) AS is_insert
        `;

        const result = await pool.query(query, [
          problem.id,
          problem.title,
          problem.concept,
          problem.difficulty,
          problem.acceptance_rate,
          problem.popularity,
          problem.leetcode_link
        ]);

        if (result.rows[0].is_insert) {
          inserted++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`⚠️  Error inserting problem ${problem.id}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   📥 Inserted: ${inserted} problems`);
    console.log(`   🔄 Updated: ${updated} problems`);
    console.log(`   📊 Total: ${problems.length} problems processed`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding
seedDatabase();

