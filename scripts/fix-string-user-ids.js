/**
 * Script to fix string user IDs to numbers in JSON files
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing string user IDs to numbers...\n');

// Fix wallet history file
const walletHistoryPath = path.join(__dirname, '..', 'data', 'wallet', 'wallet-history.json');
const walletHistory = JSON.parse(fs.readFileSync(walletHistoryPath, 'utf-8'));

let fixedCount = 0;

walletHistory.forEach(entry => {
  if (typeof entry.userId === 'string') {
    entry.userId = parseInt(entry.userId);
    fixedCount++;
  }
});

fs.writeFileSync(walletHistoryPath, JSON.stringify(walletHistory, null, 2));
console.log(`✅ Fixed ${fixedCount} string userIds in wallet history`);

// Fix invoices draft file
const invoicesDraftPath = path.join(__dirname, '..', 'data', 'invoices-log', 'invoices-draft.json');
const invoicesDraft = JSON.parse(fs.readFileSync(invoicesDraftPath, 'utf-8'));

let fixedInvoicesCount = 0;

invoicesDraft.forEach(invoice => {
  if (typeof invoice.freelancerId === 'string') {
    invoice.freelancerId = parseInt(invoice.freelancerId);
    fixedInvoicesCount++;
  }
});

fs.writeFileSync(invoicesDraftPath, JSON.stringify(invoicesDraft, null, 2));
console.log(`✅ Fixed ${fixedInvoicesCount} string freelancerIds in invoices draft`);

// Fix gigs file
const gigsPath = path.join(__dirname, '..', 'data', 'gigs', 'gigs.json');
const gigs = JSON.parse(fs.readFileSync(gigsPath, 'utf-8'));

let fixedGigsCount = 0;

gigs.forEach(gig => {
  if (typeof gig.commissionerId === 'string') {
    gig.commissionerId = parseInt(gig.commissionerId);
    fixedGigsCount++;
  }
});

fs.writeFileSync(gigsPath, JSON.stringify(gigs, null, 2));
console.log(`✅ Fixed ${fixedGigsCount} string commissionerIds in gigs`);

console.log('\n🎯 All string IDs have been converted to numbers!');
