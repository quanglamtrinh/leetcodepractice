# Data Directory

This directory contains CSV data files for the LeetCode practice application.

## CSV Files

### Problem Data Files

The application uses several CSV files to store problem information:

- `leetcode_master.csv` - Core problem data
- `leetcode_comprehensive.csv` - Extended problem information
- `leetcode_master_with_popularity.csv` - Problems with popularity scores
- `leetcode_with_concepts_and_links.csv` - Problems categorized by concepts
- `leetcode_divided_by_concepts.csv` - Problems organized by category

### CSV Format

#### Expected Columns

**Basic Problem Data:**
- `id` (integer) - Unique problem identifier
- `title` (string) - Problem title
- `concept` (string) - Problem category (e.g., "Arrays & Hashing", "Two Pointers")
- `difficulty` (string) - Easy, Medium, or Hard
- `leetcode_link` (string) - URL to the problem on LeetCode

**Optional Columns:**
- `acceptance_rate` (float) - Problem acceptance percentage
- `popularity` (integer) - Problem popularity score
- `frequency` (integer) - How often the problem appears

### CSV Import

To import CSV data into the database:

```bash
# Using npm script
npm run db:seed

# Or via API
curl -X POST http://localhost:3001/api/import-problems
```

### Data Sources

- LeetCode official problem list
- Community-curated problem collections
- Popularity data from various coding platforms

## File Management

### Adding New Problems

1. Add problem data to the appropriate CSV file
2. Ensure all required columns are present
3. Run the seed script to import: `npm run db:seed`

### CSV Guidelines

- Use UTF-8 encoding
- Quote fields containing commas or line breaks
- Keep headers consistent across files
- Validate data before importing

## Notes

- CSV files in the root directory are considered legacy/working copies
- This directory structure prepares for future data organization
- Consider using Git LFS for large CSV files (>10MB)

