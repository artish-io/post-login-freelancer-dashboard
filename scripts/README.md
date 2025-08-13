# Scripts Directory

This directory contains reusable utility scripts for the Artish project.

## Available Scripts

### Migration Utilities
- `migrate-flat-to-hierarchical.ts` - Migrates data from flat files to hierarchical storage
- `migrate-users-to-hierarchical.ts` - Migrates users to hierarchical storage with timestamp enrichment

### Testing & Validation
- `smoke-tests.js` - Runs smoke tests for critical application flows
- `validate-data-integrity.js` - Validates data consistency across storage systems

### Auditing
- `check-deprecated-file-usage.js` - Checks for usage of deprecated files in the codebase

## Usage

Run scripts using npm commands defined in package.json:

```bash
# Migration scripts
npm run migrate:storage
npm run migrate:storage:dry-run
npm run migrate:users
npm run migrate:users:dry

# Testing scripts  
npm run test:smoke

# Audit scripts
npm run check-storage
```

## Clean Directory

This directory now contains only reusable utility scripts. All one-time migration, fix, and debug scripts have been removed to maintain a clean codebase and prevent potential bugs from failed tests.
