import fetch from 'node-fetch';
import crypto from 'crypto';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/authService.js';

const baseUrl = 'http://localhost:3000';
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/facilities/registry`);
      if (res.status === 200) return true;
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function runStage2C1Verification() {
  console.log('Waiting for dev server...');
  await waitForServer(baseUrl);
  console.log('Server is ready. Running Stage 2C.1 Security & Persistence Verification...\n');

  console.log('================================================================');
  console.log('CORNERBRIEF — STAGE 2C.1 VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: Password Security & Cryptographic Parameters
  // -------------------------------------------------------------------------
  console.log('--- 1. PASSWORD SECURITY & SCRYPT VERIFICATION ---');
  try {
    const rawPass = 'CornerBriefTestPass2026!';
    const { salt, hash } = hashPassword(rawPass);

    // Verify Salt
    assert(typeof salt === 'string' && salt.length === 32, `Salt is 16 bytes random hex (32 characters, got ${salt.length})`);
    
    // Verify Hash
    assert(typeof hash === 'string' && hash.length === 128, `Key length is 64 bytes hex (128 characters, got ${hash.length})`);

    // Verify Constant-Time Verification
    const isValid = verifyPassword(rawPass, salt, hash);
    assert(isValid === true, `verifyPassword returns true for matching password`);

    const isInvalid = verifyPassword('WrongPassword123!', salt, hash);
    assert(isInvalid === false, `verifyPassword returns false for non-matching password`);

    const isTamperedSalt = verifyPassword(rawPass, salt.slice(2) + '00', hash);
    assert(isTamperedSalt === false, `verifyPassword returns false for tampered salt`);

    const isTamperedHash = verifyPassword(rawPass, salt, hash.slice(0, -2) + 'ff');
    assert(isTamperedHash === false, `verifyPassword returns false for tampered hash`);

    const isBadLengthHash = verifyPassword(rawPass, salt, hash.slice(0, 64));
    assert(isBadLengthHash === false, `verifyPassword safely handles mismatched hash length without throwing`);
  } catch (err) {
    assert(false, `Password security test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: Session Security & HMAC Tokens
  // -------------------------------------------------------------------------
  console.log('\n--- 2. SESSION SECURITY & TOKEN VERIFICATION ---');
  try {
    const testSessionId = 'test_sess_' + crypto.randomBytes(12).toString('hex');
    const token = createSessionToken(testSessionId);

    assert(token.startsWith('cb_sess_'), `Token has correct cb_sess_ prefix`);
    assert(token.includes('.'), `Token contains separator period between session ID and HMAC signature`);

    const extractedSessionId = verifySessionToken(token);
    assert(extractedSessionId === testSessionId, `Signature verification successfully extracts genuine session ID`);

    // Tampered token verification
    const tamperedSig = token.slice(0, -4) + '0000';
    assert(verifySessionToken(tamperedSig) === null, `Tampered signature is strictly rejected (returns null)`);

    const tamperedPayload = 'cb_sess_forgedid.' + token.split('.')[1];
    assert(verifySessionToken(tamperedPayload) === null, `Tampered session ID with mismatched signature rejected`);

    assert(verifySessionToken('invalid_token_format') === null, `Malformed token rejected`);
    assert(verifySessionToken('') === null, `Empty token rejected`);
  } catch (err) {
    assert(false, `Session security test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: Provisioning & Credential Reset Authorization
  // -------------------------------------------------------------------------
  console.log('\n--- 3. CREDENTIAL PROVISIONING AUTHORIZATION & SCOPE ISOLATION ---');
  let abujaAdminToken = '';
  let riversideStaffToken = '';

  try {
    // 3a. Login as Abuja FacilityAdmin (adaeze.okafor)
    const resAbujaAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'adaeze.okafor',
        password: 'AbujaAdmin2026!',
      }),
    });
    const abujaData = await resAbujaAdmin.json();
    assert(resAbujaAdmin.status === 200, `Abuja FacilityAdmin logs in successfully (200)`);
    abujaAdminToken = abujaData.session.token;

    // 3b. Unauthorized attempt without token
    const resNoAuth = await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId: 'fac_abuja_national_002',
        membershipId: 'mem_fac_abuja_national_002_musa',
        password: 'NewMusaPassword2026!',
      }),
    });
    assert(resNoAuth.status === 403, `Unauthenticated request to /api/auth/set-credentials rejected (403)`);

    // 3c. Unauthenticated spoofed header attempt (must be blocked)
    const resSpoofedHeader = await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-facility-id': 'fac_abuja_national_002',
      },
      body: JSON.stringify({
        facilityId: 'fac_abuja_national_002',
        membershipId: 'mem_fac_abuja_national_002_musa',
        password: 'NewMusaPassword2026!',
      }),
    });
    assert(resSpoofedHeader.status === 403, `Spoofed x-admin-facility-id header without Bearer token strictly rejected (403)`);

    // 3d. Cross-facility reset attempt: Abuja FacilityAdmin trying to reset Port Harcourt staff
    const resCrossFacility = await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${abujaAdminToken}`,
      },
      body: JSON.stringify({
        facilityId: 'fac_ph_riverside_003', // Target is Port Harcourt, but caller is Abuja admin
        membershipId: 'mem_fac_ph_riverside_003_musa',
        password: 'HackedPassword2026!',
      }),
    });
    assert(resCrossFacility.status === 403, `FacilityAdmin cannot modify credentials of another facility (403)`);

    // 3e. Legitimate intra-facility reset: Abuja FacilityAdmin resetting Abuja staff member (musa)
    // First, verify musa can log in with old password
    const resMusaOld = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'musa',
        password: 'MusaAbujaPass1!',
      }),
    });
    const musaOldData = await resMusaOld.json();
    assert(resMusaOld.status === 200, `musa in ACCH-ABJ logs in with current password`);
    const musaOldSessionToken = musaOldData.session.token;

    // Verify musa old session is currently valid
    const resCheckMusaOld = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${musaOldSessionToken}` },
    });
    assert(resCheckMusaOld.status === 200, `musa session is active before password reset`);

    // Reset musa password
    const resReset = await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${abujaAdminToken}`,
      },
      body: JSON.stringify({
        facilityId: 'fac_abuja_national_002',
        membershipId: 'mem_fac_abuja_national_002_musa',
        password: 'UpdatedMusaSecret2026!',
      }),
    });
    const resetData = await resReset.json();
    assert(resReset.status === 200, `FacilityAdmin successfully resets staff password in own facility (200)`);
    assert(resetData.invalidatedSessionsCount >= 1, `Existing active sessions for member invalidated on password reset`);

    // 3f. Verify old session token was terminated upon credential reset
    const resCheckMusaAfterReset = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${musaOldSessionToken}` },
    });
    assert(resCheckMusaAfterReset.status === 401, `Old session token is invalidated immediately after password reset (401)`);

    // 3g. Verify old password no longer works
    const resOldPassFail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'musa',
        password: 'MusaAbujaPass1!',
      }),
    });
    assert(resOldPassFail.status === 401, `Old password fails after reset (401)`);

    // 3h. Verify new password works
    const resNewPassSuccess = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'musa',
        password: 'UpdatedMusaSecret2026!',
      }),
    });
    assert(resNewPassSuccess.status === 200, `New password successfully authenticates (200)`);

    // Reset musa's password back to baseline for other suites
    await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${abujaAdminToken}`,
      },
      body: JSON.stringify({
        facilityId: 'fac_abuja_national_002',
        membershipId: 'mem_fac_abuja_national_002_musa',
        password: 'MusaAbujaPass1!',
      }),
    });
  } catch (err) {
    assert(false, `Provisioning authorization test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: Persistence Audit & Firestore IAM Status
  // -------------------------------------------------------------------------
  console.log('\n--- 4. PERSISTENCE AUDIT & FIRESTORE STATUS ---');
  try {
    // Audit response from set-credentials indicates whether Firestore write succeeded
    const resAudit = await fetch(`${baseUrl}/api/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${abujaAdminToken}`,
      },
      body: JSON.stringify({
        facilityId: 'fac_abuja_national_002',
        membershipId: 'mem_fac_abuja_national_002_musa',
        password: 'MusaAbujaPass1!',
      }),
    });
    const auditData = await resAudit.json();
    assert(
      auditData.persistedToFirestore === false,
      `persistedToFirestore is false (Accurately reflects Stage 2A.2 Cloud IAM restriction roles/datastore.user)`
    );
  } catch (err) {
    assert(false, `Persistence audit test threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`STAGE 2C.1 VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runStage2C1Verification().catch((e) => {
  console.error('Fatal verification error:', e);
  process.exit(1);
});
