# 🏢 Proposal Organization Placeholders - Operations Runbook

## Overview

This runbook covers the management of placeholder organizations created for proposals submitted with email-only contacts. When commissioners submit proposals without existing organization data, the system automatically creates placeholder organizations to enable project creation.

## Feature Flag Management

### Toggle Feature Flag

**Environment Variable:** `ENABLE_PROPOSAL_ORG_PLACEHOLDERS`

```bash
# Enable placeholder organization creation
ENABLE_PROPOSAL_ORG_PLACEHOLDERS=true

# Disable placeholder organization creation (safe rollback)
ENABLE_PROPOSAL_ORG_PLACEHOLDERS=false
```

### Safe Rollback Process

1. **Immediate Disable:**
   ```bash
   # In .env.local or production environment
   ENABLE_PROPOSAL_ORG_PLACEHOLDERS=false
   ```

2. **Restart Application:**
   ```bash
   # Development
   npm run dev

   # Production
   pm2 restart artish-web
   ```

3. **Verify Rollback:**
   - New proposals without organizations will fail gracefully
   - Existing placeholder organizations remain functional
   - No new placeholder organizations will be created

## Storage Management

### Check Placeholder Organizations

**Location:** `data/organizations/organizations.json`

```bash
# View all organizations
cat data/organizations/organizations.json | jq '.[] | select(.isPlaceholder == true)'

# Count placeholder organizations
cat data/organizations/organizations.json | jq '[.[] | select(.isPlaceholder == true)] | length'

# List placeholder organizations with details
cat data/organizations/organizations.json | jq '.[] | select(.isPlaceholder == true) | {id, name, email, createdBy, createdAt}'
```

### Placeholder Organization Structure

```json
{
  "id": 12345,
  "name": "John Doe's Organization",
  "email": "john.doe@example.com",
  "phone": "",
  "address": "",
  "logo": "",
  "website": "",
  "description": "Placeholder organization created for proposal submission",
  "industry": "Other",
  "size": "1-10",
  "founded": 2024,
  "isPlaceholder": true,
  "createdBy": 34,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Clean Up Placeholder Organizations (Staging Only)

⚠️ **WARNING: Only run in staging/development environments**

```javascript
// In Node.js console or test script
const { cleanupPlaceholderOrganizations } = require('./src/lib/organizations/placeholder-generator');

async function cleanup() {
  const result = await cleanupPlaceholderOrganizations();
  console.log(`Deleted ${result.deletedCount} placeholder organizations`);
  if (result.errors.length > 0) {
    console.log('Errors:', result.errors);
  }
}

cleanup();
```

## Notification Verification

### Check Commissioner Notifications

**Location:** `data/notifications/`

```bash
# Check recent notifications for a commissioner
find data/notifications -name "*.json" -exec grep -l "proposal_received\|proposal.*accepted" {} \;

# View notification details
cat data/notifications/2024/01/15/notifications-log.json | jq '.[] | select(.type == "proposal_received")'
```

### Verify Notification Delivery

1. **Check Notification Logs:**
   ```bash
   # Search for proposal acceptance notifications
   grep "PROPOSAL ACCEPTANCE.*notification" logs/application.log

   # Search for commissioner notifications
   grep "Commissioner notification result" logs/application.log
   ```

2. **Test Notification Pipeline:**
   ```bash
   # Run notification tests
   npm test -- --testNamePattern="notification"
   ```

## Monitoring & Debugging

### Audit Log Monitoring

**Search for placeholder organization events:**

```bash
# Check creation events
grep "organization_placeholder_created" logs/application.log

# Check feature flag usage
grep "placeholder_org_creation_disabled" logs/application.log

# Check validation failures
grep "invalid_email_provided" logs/application.log
```

### Common Issues & Solutions

#### Issue: Proposal acceptance fails with "Organization not found"

**Symptoms:**
```
❌ PROPOSAL ACCEPTANCE: Missing required data - Organization: false, Manager: true
```

**Solution:**
1. Check feature flag is enabled
2. Verify email format in proposal
3. Check audit logs for placeholder creation attempts

#### Issue: Duplicate placeholder organizations

**Symptoms:** Multiple organizations with same email

**Solution:**
```javascript
// Check for duplicates
const orgs = require('./data/organizations/organizations.json');
const emails = {};
orgs.forEach(org => {
  if (org.isPlaceholder && emails[org.email]) {
    console.log(`Duplicate: ${org.email} - IDs: ${emails[org.email]}, ${org.id}`);
  }
  if (org.isPlaceholder) emails[org.email] = org.id;
});
```

#### Issue: Invalid email format

**Symptoms:**
```
❌ PROPOSAL ACCEPTANCE: No email found for placeholder organization creation
```

**Solution:**
1. Check proposal data for `commissionerEmail` field
2. Verify email validation regex
3. Update proposal with valid email

## Testing

### Run Test Suite

```bash
# Run all placeholder organization tests
npm test -- src/__tests__/organization-placeholder-generator.test.ts

# Run integration tests
npm test -- src/__tests__/proposal-acceptance-integration.test.ts

# Run end-to-end tests
npm test -- src/__tests__/proposal-e2e.test.ts
```

### Manual Testing Checklist

1. **Create Proposal with Email-Only Contact:**
   - [ ] Submit proposal with only email address
   - [ ] Verify proposal is created successfully
   - [ ] Check no organization ID is set initially

2. **Accept Proposal:**
   - [ ] Commissioner accepts proposal
   - [ ] Verify placeholder organization is created
   - [ ] Check project is created successfully
   - [ ] Verify notifications are sent

3. **Reuse Existing Placeholder:**
   - [ ] Submit another proposal with same email
   - [ ] Accept proposal
   - [ ] Verify existing placeholder organization is reused
   - [ ] Check no duplicate organization is created

## Production Deployment

### Pre-Deployment Checklist

- [ ] Feature flag is set to desired state
- [ ] Tests pass in staging environment
- [ ] Notification pipeline is tested
- [ ] Rollback plan is prepared
- [ ] Monitoring alerts are configured

### Post-Deployment Verification

1. **Check Feature Flag Status:**
   ```bash
   echo $ENABLE_PROPOSAL_ORG_PLACEHOLDERS
   ```

2. **Monitor Application Logs:**
   ```bash
   tail -f logs/application.log | grep "PROPOSAL ACCEPTANCE\|organization_placeholder"
   ```

3. **Test Proposal Flow:**
   - Submit test proposal with email-only contact
   - Accept proposal
   - Verify placeholder organization creation
   - Check project creation proceeds

### Emergency Procedures

#### Immediate Disable

```bash
# Set feature flag to false
export ENABLE_PROPOSAL_ORG_PLACEHOLDERS=false

# Restart application
pm2 restart artish-web

# Verify disabled
grep "placeholder_org_creation_disabled" logs/application.log
```

#### Data Recovery

If placeholder organizations cause issues:

1. **Backup Current Data:**
   ```bash
   cp data/organizations/organizations.json data/organizations/organizations.backup.json
   ```

2. **Remove Problematic Placeholders:**
   ```javascript
   // Remove specific placeholder organization
   const orgs = require('./data/organizations/organizations.json');
   const filtered = orgs.filter(org => !(org.isPlaceholder && org.id === PROBLEMATIC_ID));
   fs.writeFileSync('./data/organizations/organizations.json', JSON.stringify(filtered, null, 2));
   ```

3. **Restore from Backup:**
   ```bash
   cp data/organizations/organizations.backup.json data/organizations/organizations.json
   ```

## Contact Information

**Development Team:** engineering@artish.com  
**Operations Team:** ops@artish.com  
**Emergency Contact:** +1-555-ARTISH-1

---

*Last Updated: January 2024*  
*Version: 1.0*
