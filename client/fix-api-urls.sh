#!/bin/bash

# Script to add API_BASE_URL to all fetch calls
# This is a quick fix - ideally should refactor to use a proper API client

echo "🔧 Fixing API URLs..."

# Add import to files that use fetch
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  if grep -q "fetch('/api" "$file"; then
    echo "Fixing: $file"
    # This is a simple sed replacement - review changes before committing
    sed -i.bak "s|fetch('/api|fetch(\`\${process.env.REACT_APP_API_URL || ''}/api|g" "$file"
    sed -i.bak "s|fetch(\"/api|fetch(\`\${process.env.REACT_APP_API_URL || ''}/api|g" "$file"
    sed -i.bak "s|fetch(\`/api|fetch(\`\${process.env.REACT_APP_API_URL || ''}/api|g" "$file"
  fi
done

echo "✅ Done! Review changes and rebuild"
echo "⚠️  Backup files created with .bak extension"
