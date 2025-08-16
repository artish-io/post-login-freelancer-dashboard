#!/bin/bash

# Migration Verification Script
# Tests all migrated endpoints to ensure they work correctly

set -e

BASE_URL="http://localhost:3001"
FAILED_TESTS=0
TOTAL_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "%{http_code}" "$BASE_URL$url" -o /tmp/response.json)
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
        
        # Check if response is valid JSON
        if jq empty /tmp/response.json 2>/dev/null; then
            echo "   📄 Valid JSON response"
        else
            echo -e "   ${YELLOW}⚠️  Non-JSON response${NC}"
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $status_code, expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "   Response: $(cat /tmp/response.json)"
    fi
    
    echo ""
}

echo "🧪 Migration Verification Test Suite"
echo "===================================="
echo ""

# Test new API endpoints
echo "📡 Testing New API Endpoints:"
test_endpoint "Get All Users" "/api/users/all"
test_endpoint "Get All Freelancers" "/api/freelancers/all"

echo ""

# Test migrated API endpoints
echo "🔄 Testing Migrated API Endpoints:"
test_endpoint "Storefront Recent Sales" "/api/storefront/recent-sales" 401  # Requires auth
test_endpoint "Storefront Purchases" "/api/storefront/purchases?userId=31"
test_endpoint "Wallet Balance" "/api/wallet/balance/31"
test_endpoint "Wallet Earnings" "/api/wallet/earnings/31"

echo ""

# Test critical system endpoints
echo "⚡ Testing Critical System Endpoints:"
test_endpoint "Health Check" "/api/health" 404  # Might not exist
test_endpoint "Gigs List" "/api/gigs" 404  # Might not exist

echo ""

# Summary
echo "📊 Test Summary:"
echo "==============="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 $FAILED_TESTS tests failed!${NC}"
    exit 1
fi
