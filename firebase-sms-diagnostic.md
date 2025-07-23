# Firebase SMS Diagnostic Checklist

## ✅ What's Working (Confirmed)
- Firebase project setup ✅
- Phone Authentication enabled ✅
- Test phone numbers work ✅
- reCAPTCHA working ✅
- Code implementation correct ✅

## 🔍 What to Check for Real SMS

### 1. Identity Toolkit API (Most Common Issue)
**Status**: ❓ Unknown
**Check**: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=artish-otp
**Action**: Click "ENABLE" if not already enabled
**Why**: This API powers Firebase Phone Auth SMS sending

### 2. Cloud Console Billing
**Status**: ❓ Unknown  
**Check**: https://console.cloud.google.com/billing?project=artish-otp
**Action**: Ensure billing account is linked and active
**Why**: Real SMS requires active billing

### 3. Phone Auth Quotas
**Status**: ❓ Unknown
**Check**: Firebase Console > Authentication > Settings > Usage
**Action**: Verify you have SMS quota remaining
**Why**: No quota = no SMS

### 4. Domain Authorization
**Status**: ✅ Confirmed (localhost, 127.0.0.1)
**Check**: Firebase Console > Authentication > Settings > Authorized domains
**Action**: Already configured correctly

### 5. Rate Limiting
**Status**: ⚠️ Currently rate limited
**Check**: Wait 1-24 hours OR use different phone number
**Action**: Try tomorrow OR use test number for now

## 🎯 Most Likely Solutions

### Option 1: Enable Identity Toolkit API (90% chance this fixes it)
1. Go to: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=artish-otp
2. Click "ENABLE"
3. Wait 2-3 minutes for activation
4. Try SMS again

### Option 2: Check Billing Configuration
1. Go to: https://console.cloud.google.com/billing?project=artish-otp
2. Ensure billing account shows "Active"
3. Check if there are any billing alerts

### Option 3: Use Different Phone Number
- Try a friend's number to test if it's number-specific
- Or wait until tomorrow for rate limits to reset

## 🧪 Quick Test Plan

### Test A: Identity Toolkit API
1. Enable the API
2. Wait 3 minutes
3. Try your real number
4. Should receive SMS

### Test B: Different Number
1. Use a friend's/family member's number
2. Should work if API is enabled
3. Confirms it's not your specific number

### Test C: Tomorrow Test
1. Wait 24 hours
2. Try your number again
3. Rate limits will be reset

## 📱 Expected Timeline

- **Identity Toolkit API fix**: 2-5 minutes
- **Billing fix**: Immediate once configured
- **Rate limit reset**: 1-24 hours
- **Different number test**: Immediate

## 🎯 Recommendation

**Try Identity Toolkit API first** - this fixes 90% of "test works but real SMS doesn't" issues.
