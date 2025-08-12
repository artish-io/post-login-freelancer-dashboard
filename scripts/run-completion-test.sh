#!/bin/bash

# Completion Invoicing Workflow Test Runner
# This script runs the comprehensive test suite for completion invoicing

set -e

echo "🧪 Completion Invoicing Workflow Test Runner"
echo "============================================="

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create test-reports directory if it doesn't exist
mkdir -p test-reports

# Check if the server is running
echo "🔍 Checking if development server is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Development server is running"
else
    echo "⚠️ Development server is not running on localhost:3000"
    echo "   Please start the server with: npm run dev"
    echo "   Or update NEXTAUTH_URL environment variable"
fi

# Run the test suite
echo ""
echo "🚀 Starting completion invoicing workflow tests..."
echo ""

# Set environment variables if not already set
export NEXTAUTH_URL=${NEXTAUTH_URL:-"http://localhost:3000"}

# Run the test script
node scripts/test-completion-invoicing-workflow.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 All tests completed successfully!"
    echo "📄 Check test-reports/ directory for detailed results"
else
    echo ""
    echo "❌ Some tests failed. Check the output above for details."
    echo "📄 Check test-reports/ directory for detailed results"
    exit 1
fi
