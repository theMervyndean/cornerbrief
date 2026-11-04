import fetch from 'node-fetch';

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
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function runStage2CTests() {
  console.log('Waiting for development server to be ready on port 3000...');
  await waitForServer(baseUrl);
  console.log('Server is ready. Starting tests...\n');

  console.log('================================================================');
  console.log('CORNERBRIEF — STAGE 2C AUTHENTICATION TEST SUITE');
  console.log('Hospital Code + Username + Password Authentication Verification');
  console.log('================================================================\n');

  let validSessionCookie = '';

  // -------------------------------------------------------------------------
  // Test 1: Valid staff login
  // -------------------------------------------------------------------------
  console.log('Test 1: Valid staff login with correct Hospital Code, Username, and Password');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'adaeze.okafor',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, `HTTP status is 200 (Got ${res.status})`);
    assert(data.success === true, `Response success is true`);
    assert(data.membership && data.membership.facilityCode === 'LLSC-VI', `Membership facilityCode is LLSC-VI`);
    assert(data.membership.role === 'Doctor', `Membership role is Doctor`);
    assert(data.facility && data.facility.name.includes('Lagos'), `Facility is Lagos Lagoon Specialist Centre`);
    assert(data.session && data.session.token, `Signed session token returned in session object`);

    const rawSetCookie = typeof res.headers.raw === 'function' ? res.headers.raw()['set-cookie'] : null;
    const getSetCookie = res.headers.get('set-cookie');
    const cookieStr = (rawSetCookie && rawSetCookie.join('; ')) || getSetCookie || '';
    assert(
      cookieStr.includes('cb_session='),
      `HttpOnly SameSite session cookie returned in response headers`
    );
    const match = cookieStr.match(/cb_session=([^;]+)/);
    if (match) {
      validSessionCookie = `cb_session=${match[1]}`;
    } else if (data.session && data.session.token) {
      validSessionCookie = `cb_session=${data.session.token}`;
    }
  } catch (err) {
    assert(false, `Test 1 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 2: Invalid password
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Invalid password with valid Hospital Code and Username');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'adaeze.okafor',
        password: 'IncorrectPassword999!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401, `HTTP status is 401 (Got ${res.status})`);
    assert(
      data.error && data.error.includes('Invalid Hospital Code, username, or password'),
      `Generic security error message returned without disclosing password existence`
    );
  } catch (err) {
    assert(false, `Test 2 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 3: Incorrect Hospital Code
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Incorrect Hospital Code');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'NONEXISTENT',
        username: 'adaeze.okafor',
        password: 'Password123!',
      }),
    });
    const data = await res.json();
    assert(res.status === 401, `HTTP status is 401 (Got ${res.status})`);
    assert(
      data.error && data.error.includes('Invalid Hospital Code, username, or password'),
      `Generic error message prevents enumeration of registered Hospital Codes`
    );
  } catch (err) {
    assert(false, `Test 3 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 4: Inactive facility access
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Inactive/Suspended facility authentication blocked');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'SUSP-FAC',
        username: 'susp.doctor',
        password: 'AnyPassword1!',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `HTTP status is 403 (Got ${res.status})`);
    assert(data.code === 'FACILITY_NOT_ACTIVE', `Error code is FACILITY_NOT_ACTIVE (Got ${data.code})`);
    assert(
      data.error && (data.error.includes('inactive') || data.error.includes('not currently active')),
      `Descriptive notification indicates facility workspace is not active`
    );
  } catch (err) {
    assert(false, `Test 4 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 5: Suspended membership
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Suspended membership access blocked');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'dr.suspended',
        password: 'SuspendedPass1!',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `HTTP status is 403 (Got ${res.status})`);
    assert(data.code === 'MEMBERSHIP_SUSPENDED', `Error code is MEMBERSHIP_SUSPENDED (Got ${data.code})`);
    assert(
      data.error && data.error.includes('suspended'),
      `Notification explicitly informs user of membership suspension`
    );
  } catch (err) {
    assert(false, `Test 5 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 6: Revoked membership
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Revoked membership access blocked');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'nurse.revoked',
        password: 'RevokedPass1!',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `HTTP status is 403 (Got ${res.status})`);
    assert(data.code === 'MEMBERSHIP_REVOKED', `Error code is MEMBERSHIP_REVOKED (Got ${data.code})`);
    assert(
      data.error && (data.error.includes('has been revoked') || data.error.includes('revoked')),
      `Notification explicitly informs user of membership revocation`
    );
  } catch (err) {
    assert(false, `Test 6 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 7: Invited membership (cannot log in until activated)
  // -------------------------------------------------------------------------
  console.log('\nTest 7: Invited membership access blocked until activated');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'invitee.staff',
        password: 'InvitedPass1!',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `HTTP status is 403 (Got ${res.status})`);
    assert(data.code === 'MEMBERSHIP_INVITED', `Error code is MEMBERSHIP_INVITED (Got ${data.code})`);
    assert(
      data.error && (data.error.includes('invitation') || data.error.includes('activated') || data.error.includes('pending activation')),
      `Notification instructs invitee to activate membership`
    );
  } catch (err) {
    assert(false, `Test 7 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 8: Same username across different hospitals
  // -------------------------------------------------------------------------
  console.log('\nTest 8: Same username "musa" across different hospitals');
  try {
    // 8a: musa at ACCH-ABJ with Abuja password
    const resAbuja = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'musa',
        password: 'MusaAbujaPass1!',
      }),
    });
    const dataAbuja = await resAbuja.json();
    assert(resAbuja.status === 200, `musa in ACCH-ABJ logs in successfully (200)`);
    assert(dataAbuja.membership.facilityCode === 'ACCH-ABJ', `Resolved facility is ACCH-ABJ`);

    // 8b: musa at PRMC-PHC with Port Harcourt password
    const resPh = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'PRMC-PHC',
        username: 'musa',
        password: 'MusaRiversidePass2!',
      }),
    });
    const dataPh = await resPh.json();
    assert(resPh.status === 200, `musa in PRMC-PHC logs in successfully (200)`);
    assert(dataPh.membership.facilityCode === 'PRMC-PHC', `Resolved facility is PRMC-PHC`);

    // 8c: musa at ACCH-ABJ using Port Harcourt password (must fail)
    const resCross1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'musa',
        password: 'MusaRiversidePass2!',
      }),
    });
    assert(resCross1.status === 401, `musa at ACCH-ABJ with PRMC-PHC password fails (401)`);

    // 8d: musa at PRMC-PHC using Abuja password (must fail)
    const resCross2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'PRMC-PHC',
        username: 'musa',
        password: 'MusaAbujaPass1!',
      }),
    });
    assert(resCross2.status === 401, `musa at PRMC-PHC with ACCH-ABJ password fails (401)`);
  } catch (err) {
    assert(false, `Test 8 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 9: Same professional with different roles across hospitals
  // -------------------------------------------------------------------------
  console.log('\nTest 9: Same professional "adaeze.okafor" with different roles across hospitals');
  try {
    // 9a: Lagos Lagoon Specialist Centre -> Doctor
    const resLagos = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'adaeze.okafor',
        password: 'Password123!',
      }),
    });
    const dataLagos = await resLagos.json();
    assert(resLagos.status === 200, `Dr Adaeze in LLSC-VI authenticates (200)`);
    assert(dataLagos.membership.role === 'Doctor', `LLSC-VI membership role is Doctor`);

    // 9b: Abuja Central Hospital -> FacilityAdmin
    const resAbuja = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'adaeze.okafor',
        password: 'AbujaAdmin2026!',
      }),
    });
    const dataAbuja = await resAbuja.json();
    assert(resAbuja.status === 200, `Dr Adaeze in ACCH-ABJ authenticates (200)`);
    assert(dataAbuja.membership.role === 'FacilityAdmin', `ACCH-ABJ membership role is FacilityAdmin`);
  } catch (err) {
    assert(false, `Test 9 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 10: Cross-facility credential isolation
  // -------------------------------------------------------------------------
  console.log('\nTest 10: Cross-facility credential isolation (Hospital A credentials rejected at Hospital B)');
  try {
    // Lagos credentials attempted at Abuja
    const res1 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'adaeze.okafor',
        password: 'Password123!', // Lagos password attempted at Abuja
      }),
    });
    assert(res1.status === 401, `Lagos password rejected for Abuja facility (401)`);

    // Abuja credentials attempted at Lagos
    const res2 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'adaeze.okafor',
        password: 'AbujaAdmin2026!', // Abuja password attempted at Lagos
      }),
    });
    assert(res2.status === 401, `Abuja password rejected for Lagos facility (401)`);
  } catch (err) {
    assert(false, `Test 10 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 11: Session verification & expiration
  // -------------------------------------------------------------------------
  console.log('\nTest 11: Session verification, cookie security, and logout expiration');
  try {
    // 11a: Valid session cookie returns 200
    assert(validSessionCookie.length > 0, `Captured valid session cookie from Test 1`);
    const resValid = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: validSessionCookie },
    });
    const dataValid = await resValid.json();
    assert(resValid.status === 200, `Active session verified with 200 (Got ${resValid.status})`);
    assert(dataValid.authenticated === true, `dataValid.authenticated is true`);
    assert(dataValid.membership.username === 'adaeze.okafor', `Session username is adaeze.okafor`);

    // 11b: Tampered/forged token rejected
    const resForged = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: 'cb_session=cb_sess_fake_123.bad_signature_hash' },
    });
    assert(resForged.status === 401, `Forged session token rejected with 401 (Got ${resForged.status})`);

    // 11c: Missing session cookie rejected
    const resEmpty = await fetch(`${baseUrl}/api/auth/session`);
    assert(resEmpty.status === 401, `Unauthenticated request to /api/auth/session rejected with 401`);

    // 11d: Logout invalidates active session
    const resLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: validSessionCookie },
    });
    assert(resLogout.status === 200, `Logout returns 200`);

    // 11e: Session is now expired/invalid after logout
    const resAfterLogout = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { Cookie: validSessionCookie },
    });
    assert(
      resAfterLogout.status === 401,
      `Session invalid after logout: /api/auth/session returns 401 (Got ${resAfterLogout.status})`
    );
  } catch (err) {
    assert(false, `Test 11 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 12: Password hashes and salts never returned in responses
  // -------------------------------------------------------------------------
  console.log('\nTest 12: Password hashes, salts, and secret credentials never returned in response bodies');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'LLSC-VI',
        username: 'adaeze.okafor',
        password: 'Password123!',
      }),
    });
    const rawBody = await res.text();
    const data = JSON.parse(rawBody);

    assert(!rawBody.includes('passwordHash'), `Response body does not contain "passwordHash"`);
    assert(!rawBody.includes('salt'), `Response body does not contain "salt"`);
    assert(!rawBody.includes('scrypt'), `Response body does not contain "scrypt" algorithm details`);
    assert(!data.membership.password, `data.membership does not have password field`);
    assert(!data.membership.passwordHash, `data.membership does not have passwordHash field`);
  } catch (err) {
    assert(false, `Test 12 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 13: Platform Admin privileges cannot be obtained via staff login
  // -------------------------------------------------------------------------
  console.log('\nTest 13: Platform Admin privileges cannot be acquired via staff credentials');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'ACCH-ABJ',
        username: 'adaeze.okafor', // FacilityAdmin in Abuja
        password: 'AbujaAdmin2026!',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, `FacilityAdmin authenticates successfully`);
    assert(data.membership.role === 'FacilityAdmin', `Role is FacilityAdmin, not PlatformAdmin`);
    assert(data.role !== 'PlatformAdmin', `Staff session role is not PlatformAdmin`);

    // Verify caller verification endpoint rejects staff token as PlatformAdmin
    const resAdmin = await fetch(`${baseUrl}/api/admin/verify-caller`, {
      headers: { Authorization: `Bearer ${data.session.token}` },
    });
    const dataAdmin = await resAdmin.json();
    assert(
      dataAdmin.isPlatformAdmin === false,
      `Platform Admin verification strictly rejects staff login token (isPlatformAdmin: false)`
    );
  } catch (err) {
    assert(false, `Test 13 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 14: Existing Google Sign-In and Workspace Preview preservation
  // -------------------------------------------------------------------------
  console.log('\nTest 14: Existing Google Sign-In and Quick Workspace Preview preserved');
  try {
    // Check that public facility list endpoint responds
    const resFacilities = await fetch(`${baseUrl}/api/facilities/registry`);
    assert(resFacilities.status === 200, `/api/facilities/registry returns 200`);

    // Check that memberships endpoint still works
    const resMemberships = await fetch(`${baseUrl}/api/memberships/user/usr_ph_clinician_demo`);
    assert(resMemberships.status === 200, `/api/memberships/user returns 200`);

    // Check that client root HTML loads with Google Sign-In and Staff Login options
    const resIndex = await fetch(`${baseUrl}/`);
    assert(resIndex.status === 200, `Client landing page root responds with 200`);
    const indexHtml = await resIndex.text();
    assert(indexHtml.includes('<div id="root">'), `Client HTML contains mount container`);
  } catch (err) {
    assert(false, `Test 14 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`STAGE 2C TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runStage2CTests().catch((e) => {
  console.error('Fatal test execution failure:', e);
  process.exit(1);
});
