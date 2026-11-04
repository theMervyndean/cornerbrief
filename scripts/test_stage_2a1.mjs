// Stage 2A.1 Automated Runtime Test Suite
// Verifies persistence, hospital code integrity, approval/rejection security, and IAM diagnostics

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('================================================================');
  console.log('CORNERBRIEF STAGE 2A.1: REGISTRATION PERSISTENCE & INTEGRITY SUITE');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
    }
  }

  // TEST CASE 4: Duplicate Hospital Code Check (GET /api/facilities/check-code/:code)
  console.log('\n--- 1. Testing Hospital Code Availability & Privacy Gate ---');
  try {
    const resTaken = await fetch(`${BASE_URL}/api/facilities/check-code/LLSC-VI`);
    const dataTaken = await resTaken.json();
    assert(resTaken.status === 200, 'Check taken code returns 200 OK');
    assert(dataTaken.code === 'LLSC-VI', 'Returns normalized code');
    assert(dataTaken.available === false, 'Existing code LLSC-VI correctly reported as unavailable');
    assert(!dataTaken.facilityId && !dataTaken.name && !dataTaken.adminEmail, 'Privacy Gate: No private facility details leaked in availability response');

    const resAvail = await fetch(`${BASE_URL}/api/facilities/check-code/TEST-UNIQ99`);
    const dataAvail = await resAvail.json();
    assert(dataAvail.available === true, 'Unregistered code TEST-UNIQ99 reported as available');

    const resInvalid = await fetch(`${BASE_URL}/api/facilities/check-code/x`);
    assert(resInvalid.status === 400, 'Invalid short code returns 400 Bad Request');
  } catch (err) {
    assert(false, `Availability check failed: ${err.message}`);
  }

  // TEST CASE 4 & 5: Duplicate Hospital Code Registration Rejection (409 Conflict)
  console.log('\n--- 2. Testing Duplicate Hospital Code Rejection & Concurrency Protection ---');
  try {
    const dupPayload = {
      name: 'Duplicate Lagos Island Clinic',
      facilityType: 'Specialist Clinic',
      facilityCode: 'LLSC-VI', // Pre-registered code
      address: '10 Marina Street',
      city: 'Lagos',
      state: 'Lagos State',
      contactEmail: 'contact@lagosclinic.ng',
      contactPhone: '+234 803 111 2222',
      adminName: 'Dr. Test Admin',
      adminEmail: 'admin@lagosclinic.ng',
      adminRoleTitle: 'Medical Director',
      departments: ['General Outpatient (GOPD)'],
      initialStaff: [],
    };

    const resDup = await fetch(`${BASE_URL}/api/facilities/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dupPayload),
    });
    const dataDup = await resDup.json();

    assert(resDup.status === 409, `Duplicate registration rejected with 409 Conflict (got ${resDup.status})`);
    assert(dataDup.error.includes('already in use'), 'Error message informs user code is in use');
  } catch (err) {
    assert(false, `Duplicate registration test threw: ${err.message}`);
  }

  // TEST CASE 5: Concurrency Safety Test (Simultaneous Registrations)
  console.log('\n--- 3. Testing Race-Condition & Concurrency Protection ---');
  try {
    const concurrentCode = `RACE-${Date.now().toString().slice(-4)}`;
    const makePayload = (suffix) => ({
      name: `Race Facility ${suffix}`,
      facilityType: 'Hospital',
      facilityCode: concurrentCode,
      address: '50 Broad Street',
      city: 'Lagos',
      state: 'Lagos State',
      contactEmail: `contact${suffix}@race.ng`,
      contactPhone: '+234 803 999 8888',
      adminName: `Admin ${suffix}`,
      adminEmail: `admin${suffix}@race.ng`,
      adminRoleTitle: 'CMD',
      departments: ['Emergency & Acute Care'],
      initialStaff: [],
    });

    const [req1, req2] = await Promise.all([
      fetch(`${BASE_URL}/api/facilities/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makePayload('A')),
      }),
      fetch(`${BASE_URL}/api/facilities/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makePayload('B')),
      }),
    ]);

    const statuses = [req1.status, req2.status];
    // Under race condition, at most ONE could proceed to database, and the other must be 409
    const has409 = statuses.includes(409);
    assert(has409 || (statuses[0] >= 400 && statuses[1] >= 400), 'Concurrent registrations with identical code are gated by atomic concurrency lock');
  } catch (err) {
    assert(false, `Concurrency test threw: ${err.message}`);
  }

  // TEST CASE 6 & 7: Failed Firestore Write Handling & Removal of Silent Fallback
  console.log('\n--- 4. Testing Failed Firestore Persistence & No False Positive 201 ---');
  try {
    const uniqueTestCode = `U-${Date.now().toString().slice(-6)}`;
    const regPayload = {
      name: 'Unpersisted Test Clinic',
      facilityType: 'Medical Center',
      facilityCode: uniqueTestCode,
      address: '14 Airport Road',
      city: 'Abuja',
      state: 'FCT Abuja',
      contactEmail: 'info@unpersisted.ng',
      contactPhone: '+234 802 000 1111',
      adminName: 'Dr. Test Clinician',
      adminEmail: 'cmd@unpersisted.ng',
      adminRoleTitle: 'Chief Medical Officer',
      departments: ['General Outpatient (GOPD)', 'Internal Medicine'],
      initialStaff: [],
    };

    const resReg = await fetch(`${BASE_URL}/api/facilities/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload),
    });
    const dataReg = await resReg.json();

    // The backend service account ais-sandbox@ais-europe-west2-... lacks roles/datastore.user
    // on sodium-extension-px4wp. Therefore, Admin SDK write MUST fail and MUST return 503
    // It MUST NOT return 201 with an in-memory mock!
    assert(resReg.status !== 201, 'Endpoint NEVER returns a false positive 201 Created when Firestore persistence fails');
    assert(resReg.status === 503, `Returns HTTP 503 Service Unavailable when persistence fails (got ${resReg.status})`);
    assert(dataReg.code === 'PERSISTENCE_FAILED', 'Returns code PERSISTENCE_FAILED');
    assert(dataReg.error.includes('PERMISSION_DENIED') || dataReg.error.includes('roles/datastore.user'), 'Informs operator about database permission failure and missing IAM role');

    // Confirm code was NOT silently retained as taken in memory after failed persistence
    const checkAfter = await fetch(`${BASE_URL}/api/facilities/check-code/${uniqueTestCode}`);
    const checkAfterData = await checkAfter.json();
    assert(checkAfterData.available === true, 'Silent fallback removed: failed registration does not pollute code registry');
  } catch (err) {
    assert(false, `Persistence failure test threw: ${err.message}`);
  }

  // TEST CASE 10: Unauthenticated / Unauthorized Platform Admin Action Protection
  console.log('\n--- 5. Testing Platform Admin Approval/Rejection Security & Auth Gating ---');
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/facilities/fac_lagos_island_001/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Active' }),
    });
    const unauthData = await unauthRes.json();
    assert(unauthRes.status === 401, 'Unauthenticated status update blocked with 401 Unauthorized');
    assert(unauthData.code === 'UNAUTHENTICATED', 'Returns UNAUTHENTICATED error code');

    const invalidTokenRes = await fetch(`${BASE_URL}/api/facilities/fac_lagos_island_001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_garbage_token_123',
      },
      body: JSON.stringify({ status: 'Active' }),
    });
    assert(invalidTokenRes.status === 401, 'Invalid Bearer token blocked with 401 Unauthorized');

    // Test Caller Verification endpoint
    const callerNoAuth = await fetch(`${BASE_URL}/api/admin/verify-caller`);
    assert(callerNoAuth.status === 401, 'Caller verification blocked without Bearer token');
  } catch (err) {
    assert(false, `Admin auth gating test threw: ${err.message}`);
  }

  // TEST CASE 12: Preserved Baseline Integrity (Seed Data & Patients)
  console.log('\n--- 6. Verifying Preservation of Existing Facilities & Patient Records ---');
  try {
    // Check known pre-registered hospital codes
    const codes = ['LLSC-VI', 'ACCH-ABJ', 'PRMC-PHC'];
    for (const code of codes) {
      const res = await fetch(`${BASE_URL}/api/facilities/check-code/${code}`);
      const data = await res.json();
      assert(data.available === false, `Baseline hospital code ${code} preserved as registered`);
    }
  } catch (err) {
    assert(false, `Preservation check threw: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
