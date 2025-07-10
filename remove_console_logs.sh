#!/bin/bash

# Script to remove console statements from the codebase
# This improves performance in production

# Default behavior is to remove all console statements
KEEP_ERRORS=false
FIX_SYNTAX=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --keep-errors)
      KEEP_ERRORS=true
      shift
      ;;
    --no-fix)
      FIX_SYNTAX=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo "Removing console statements from the codebase..."
if [ "$KEEP_ERRORS" = true ]; then
  echo "Keeping console.error statements for production error reporting."
fi

# Find all TypeScript and JavaScript files
FILES=$(find ./src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx")

# Counters for removed statements
REMOVED_LOGS=0
REMOVED_ERRORS=0
REMOVED_DEBUG=0
REMOVED_WARNS=0
TOTAL_REMOVED=0

# Process each file
for FILE in $FILES; do
  # Count occurrences before removal
  COUNT_LOGS=$(grep -c "console\.log" "$FILE" 2>/dev/null || echo 0)
  COUNT_ERRORS=$(grep -c "console\.error" "$FILE" 2>/dev/null || echo 0)
  COUNT_DEBUG=$(grep -c "console\.debug" "$FILE" 2>/dev/null || echo 0)
  COUNT_WARNS=$(grep -c "console\.warn" "$FILE" 2>/dev/null || echo 0)
  
  # Make sure counts are valid integers
  if ! [[ "$COUNT_LOGS" =~ ^[0-9]+$ ]]; then
    COUNT_LOGS=0
  fi
  
  if ! [[ "$COUNT_ERRORS" =~ ^[0-9]+$ ]]; then
    COUNT_ERRORS=0
  fi
  
  if ! [[ "$COUNT_DEBUG" =~ ^[0-9]+$ ]]; then
    COUNT_DEBUG=0
  fi
  
  if ! [[ "$COUNT_WARNS" =~ ^[0-9]+$ ]]; then
    COUNT_WARNS=0
  fi
  
  # Calculate total count using proper bash syntax
  if [ "$KEEP_ERRORS" = true ]; then
    TOTAL_COUNT=$((COUNT_LOGS + COUNT_DEBUG + COUNT_WARNS))
  else
    TOTAL_COUNT=$((COUNT_LOGS + COUNT_DEBUG + COUNT_ERRORS + COUNT_WARNS))
  fi
  
  if [ "$TOTAL_COUNT" -gt 0 ]; then
    echo "Processing $FILE ($COUNT_LOGS logs, $COUNT_ERRORS errors, $COUNT_DEBUG debug, $COUNT_WARNS warn statements found)"
    
    # Remove console.log statements
    if [ "$COUNT_LOGS" -gt 0 ]; then
      sed -i '' '/console\.log/d' "$FILE"
      REMOVED_LOGS=$((REMOVED_LOGS + COUNT_LOGS))
    fi
    
    # Remove console.debug statements
    if [ "$COUNT_DEBUG" -gt 0 ]; then
      sed -i '' '/console\.debug/d' "$FILE"
      REMOVED_DEBUG=$((REMOVED_DEBUG + COUNT_DEBUG))
    fi
    
    # Remove console.warn statements
    if [ "$COUNT_WARNS" -gt 0 ]; then
      sed -i '' '/console\.warn/d' "$FILE"
      REMOVED_WARNS=$((REMOVED_WARNS + COUNT_WARNS))
    fi
    
    # Remove console.error statements if not keeping them
    if [ "$KEEP_ERRORS" = false ] && [ "$COUNT_ERRORS" -gt 0 ]; then
      sed -i '' '/console\.error/d' "$FILE"
      REMOVED_ERRORS=$((REMOVED_ERRORS + COUNT_ERRORS))
    fi
  fi
done

TOTAL_REMOVED=$((REMOVED_LOGS + REMOVED_DEBUG + REMOVED_ERRORS + REMOVED_WARNS))

echo "Done! Removed $TOTAL_REMOVED console statements from the codebase:"
echo "  - $REMOVED_LOGS console.log statements"
echo "  - $REMOVED_DEBUG console.debug statements"
echo "  - $REMOVED_WARNS console.warn statements"
if [ "$KEEP_ERRORS" = false ]; then
  echo "  - $REMOVED_ERRORS console.error statements"
else
  echo "  - Kept all console.error statements for production error reporting"
fi

# Fix syntax errors caused by removing console statements
if [ "$FIX_SYNTAX" = true ] && [ "$TOTAL_REMOVED" -gt 0 ]; then
  echo "Fixing common syntax errors after removing console statements..."
  
  # Find files that still have console references (might have incomplete statements)
  AFFECTED_FILES=$(grep -l "console\." $FILES)
  
  if [ -n "$AFFECTED_FILES" ]; then
    for FILE in $AFFECTED_FILES; do
      echo "Checking $FILE for syntax issues..."
      
      # Replace incomplete object expressions that were part of console statements
      sed -i '' 's/[a-zA-Z0-9_]*:.*,$/\/\/ Removed console statement/g' "$FILE"
      sed -i '' 's/[a-zA-Z0-9_]*:.*);$/\/\/ Removed console statement/g' "$FILE"
      
      # Fix any trailing parentheses from removed console statements
      sed -i '' 's/^\s*)\s*;$/\/\/ Removed console statement/g' "$FILE"
      
      # Replace any dangling objects that were arguments to console methods
      sed -i '' 's/{[^{}]*})/\/\/ Removed console statement/g' "$FILE"
    done
  fi
  
  echo "Syntax fixes applied."
fi

echo "Remember to add proper logging for production if needed." 