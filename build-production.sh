#!/bin/bash

# Production build script
# This script removes console logs and builds the application for production

echo "Starting production build process..."

# Step 1: Remove all console logs
echo "Removing console logs..."
./remove_console_logs.sh

# Step 2: Check for syntax errors
echo "Checking for syntax errors..."
npm run lint || {
  echo "Syntax errors found after removing console logs."
  echo "Attempting to fix common syntax errors..."
  
  # Fix common syntax errors caused by removing console logs
  find ./src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "console\." | while read file; do
    # Replace incomplete object expressions that were part of console statements
    sed -i '' 's/[a-zA-Z0-9_]*:.*,$/\/\/ Removed console statement/g' "$file"
    sed -i '' 's/[a-zA-Z0-9_]*:.*);$/\/\/ Removed console statement/g' "$file"
    
    # Fix any trailing parentheses from removed console statements
    sed -i '' 's/^\s*)\s*;$/\/\/ Removed console statement/g' "$file"
  done
  
  echo "Fixed common syntax errors. Running lint again..."
  npm run lint
}

# Step 3: Build the application
echo "Building application for production..."
npm run build

# Step 4: Report completion
echo "Production build complete!"
echo "You can now deploy the application." 