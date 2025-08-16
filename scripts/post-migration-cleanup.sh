#!/bin/bash

# Post-Migration Cleanup Script
# Run this script 30 days after migration to clean up temporary files

echo "🧹 Post-Migration Cleanup"
echo "========================="
echo ""

# Check if migration was successful
echo "1️⃣ Verifying migration success..."
USERS_COUNT=$(curl -s http://localhost:3001/api/users/all | jq '. | length' 2>/dev/null || echo "0")
FREELANCERS_COUNT=$(curl -s http://localhost:3001/api/freelancers/all | jq '. | length' 2>/dev/null || echo "0")

if [ "$USERS_COUNT" -gt "0" ] && [ "$FREELANCERS_COUNT" -gt "0" ]; then
    echo "✅ Migration verification successful ($USERS_COUNT users, $FREELANCERS_COUNT freelancers)"
else
    echo "❌ Migration verification failed - DO NOT RUN CLEANUP"
    exit 1
fi

echo ""

# Optional cleanup (uncomment after 30 days)
echo "2️⃣ Optional cleanup items (uncomment after 30 days):"
echo "   - src/lib/migration/ directory"
echo "   - scripts/test-migration.ts"
echo "   - scripts/verify-migration.sh"
echo ""

# Keep these files
echo "3️⃣ Files to keep permanently:"
echo "   ✅ MIGRATION-REPORT.md"
echo "   ✅ src/app/api/users/all/route.ts"
echo "   ✅ src/app/api/freelancers/all/route.ts"
echo "   ✅ src/app/api/organizations/all/route.ts"
echo ""

echo "🎉 Migration cleanup check complete!"
echo "    Run this script again in 30 days to perform actual cleanup."
