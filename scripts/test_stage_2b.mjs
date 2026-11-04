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

async function runStage2BTests() {
  console.log('================================================================');
  console.log('CORNERBRIEF — STAGE 2B FACILITY MEMBERSHIP ARCHITECTURE TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // Test 1: One staff member with one facility membership
  // -------------------------------------------------------------------------
  console.log('Test 1: One staff member with one facility membership');
  try {
    const res = await fetch(`${baseUrl}/api/memberships/user/usr_ph_clinician_demo`);
    const data = await res.json();
    assert(res.status === 200, `HTTP status is 200 (Got ${res.status})`);
    assert(data.memberships.length === 1, `Exactly 1 facility membership found (Got ${data.memberships.length})`);
    assert(data.memberships[0].facilityCode === 'PRMC-PHC', `Facility code is PRMC-PHC (Got ${data.memberships[0].facilityCode})`);
    assert(data.memberships[0].role === 'Doctor', `Role is Doctor (Got ${data.memberships[0].role})`);
  } catch (err) {
    assert(false, `Test 1 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 2: One staff member with two facility memberships
  // -------------------------------------------------------------------------
  console.log('\nTest 2: One staff member with two facility memberships across different hospitals');
  try {
    const res = await fetch(`${baseUrl}/api/memberships/user/usr_clinician_demo`);
    const data = await res.json();
    assert(res.status === 200, `HTTP status is 200 (Got ${res.status})`);
    assert(data.memberships.length === 2, `User belongs to 2 separate facilities (Got ${data.memberships.length})`);
    const facCodes = data.memberships.map((m) => m.facilityCode).sort();
    assert(
      JSON.stringify(facCodes) === JSON.stringify(['ACCH-ABJ', 'LLSC-VI']),
      `Belongs to both ACCH-ABJ and LLSC-VI (Got ${facCodes.join(', ')})`
    );
  } catch (err) {
    assert(false, `Test 2 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 3: Different roles for the same user across two facilities
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Different roles for the same user across two facilities');
  try {
    const res = await fetch(`${baseUrl}/api/memberships/user/usr_clinician_demo`);
    const data = await res.json();
    const lagosMembership = data.memberships.find((m) => m.facilityCode === 'LLSC-VI');
    const abujaMembership = data.memberships.find((m) => m.facilityCode === 'ACCH-ABJ');
    assert(lagosMembership && lagosMembership.role === 'Doctor', `Lagos role is "Doctor" (Got ${lagosMembership?.role})`);
    assert(abujaMembership && abujaMembership.role === 'FacilityAdmin', `Abuja role is "FacilityAdmin" (Got ${abujaMembership?.role})`);
    assert(
      lagosMembership.permissions.includes('ai:generate') && !lagosMembership.permissions.includes('facility:manage'),
      `Lagos permissions reflect clinical scope (ai:generate=true, facility:manage=false)`
    );
    assert(
      abujaMembership.permissions.includes('facility:manage') && abujaMembership.permissions.includes('staff:manage'),
      `Abuja permissions reflect institutional admin scope (facility:manage=true, staff:manage=true)`
    );
  } catch (err) {
    assert(false, `Test 3 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 4: Duplicate username within one facility rejected (409)
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Duplicate username within one facility rejected');
  try {
    // Attempt to register existing username 'adaeze.okafor' in lagos
    const resExact = await fetch(`${baseUrl}/api/facilities/fac_lagos_island_001/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-facility-id': 'fac_lagos_island_001',
      },
      body: JSON.stringify({
        userId: 'usr_new_test_applicant',
        username: 'adaeze.okafor',
        role: 'Doctor',
      }),
    });
    const dataExact = await resExact.json();
    assert(resExact.status === 409, `Exact duplicate username returns HTTP 409 (Got ${resExact.status})`);
    assert(dataExact.code === 'USERNAME_ALREADY_EXISTS_IN_FACILITY', `Error code is USERNAME_ALREADY_EXISTS_IN_FACILITY (Got ${dataExact.code})`);

    // Case-insensitive duplicate check ('ADAEZE.OKAFOR')
    const resCase = await fetch(`${baseUrl}/api/facilities/fac_lagos_island_001/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-facility-id': 'fac_lagos_island_001',
      },
      body: JSON.stringify({
        userId: 'usr_new_test_applicant_case',
        username: 'ADAEZE.OKAFOR',
        role: 'Nurse',
      }),
    });
    const dataCase = await resCase.json();
    assert(resCase.status === 409, `Case-insensitive duplicate returns HTTP 409 (Got ${resCase.status})`);
  } catch (err) {
    assert(false, `Test 4 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 5: Same username across different facilities accepted
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Same username across different facilities accepted');
  try {
    const resAbuja = await fetch(`${baseUrl}/api/facilities/fac_abuja_national_002/check-username/musa`);
    const dataAbuja = await resAbuja.json();
    assert(dataAbuja.available === false, `Username "musa" is taken in Abuja (Got available: ${dataAbuja.available})`);

    const resRiverside = await fetch(`${baseUrl}/api/facilities/fac_ph_riverside_003/check-username/musa`);
    const dataRiverside = await resRiverside.json();
    assert(dataRiverside.available === false, `Username "musa" is also assigned in Riverside (Got available: ${dataRiverside.available})`);

    const resLagos = await fetch(`${baseUrl}/api/facilities/fac_lagos_island_001/check-username/musa`);
    const dataLagos = await resLagos.json();
    assert(dataLagos.available === true, `Username "musa" is available in Lagos where it is not yet taken (Got available: ${dataLagos.available})`);

    // Successful registration of 'musa' in Lagos by facility admin
    const resCreate = await fetch(`${baseUrl}/api/facilities/fac_lagos_island_001/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-facility-id': 'fac_lagos_island_001',
      },
      body: JSON.stringify({
        userId: 'usr_lagos_musa_unique',
        username: 'musa',
        role: 'Doctor',
        departmentId: 'Cardiology & Hypertension',
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 201, `Created username "musa" in Lagos returning HTTP 201 (Got ${resCreate.status})`);
    assert(dataCreate.membership.facilityId === 'fac_lagos_island_001', `Membership facility is Lagos (Got ${dataCreate.membership?.facilityId})`);
  } catch (err) {
    assert(false, `Test 5 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 6: Suspended membership rejection
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Suspended membership rejection');
  try {
    const res = await fetch(`${baseUrl}/api/clinical/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_suspended_demo',
        activeFacilityId: 'fac_lagos_island_001',
        patientFacilityId: 'fac_lagos_island_001',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `Suspended member rejected with HTTP 403 (Got ${res.status})`);
    assert(data.code === 'MEMBERSHIP_SUSPENDED', `Error code is MEMBERSHIP_SUSPENDED (Got ${data.code})`);
  } catch (err) {
    assert(false, `Test 6 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 7: Revoked membership rejection
  // -------------------------------------------------------------------------
  console.log('\nTest 7: Revoked membership rejection');
  try {
    const res = await fetch(`${baseUrl}/api/clinical/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_revoked_demo',
        activeFacilityId: 'fac_lagos_island_001',
        patientFacilityId: 'fac_lagos_island_001',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `Revoked member rejected with HTTP 403 (Got ${res.status})`);
    assert(data.code === 'MEMBERSHIP_REVOKED', `Error code is MEMBERSHIP_REVOKED (Got ${data.code})`);
  } catch (err) {
    assert(false, `Test 7 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 8: Suspended facility rejection
  // -------------------------------------------------------------------------
  console.log('\nTest 8: Suspended facility rejection');
  try {
    // Attempt access in a non-existent or inactive facility
    const res = await fetch(`${baseUrl}/api/clinical/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_clinician_demo',
        activeFacilityId: 'fac_unregistered_or_suspended',
        patientFacilityId: 'fac_unregistered_or_suspended',
      }),
    });
    const data = await res.json();
    assert(res.status === 403, `Inactive/Unregistered facility access rejected with HTTP 403 (Got ${res.status})`);
    assert(data.code === 'FACILITY_NOT_FOUND' || data.code === 'FACILITY_NOT_ACTIVE', `Rejected with facility status error (Got ${data.code})`);
  } catch (err) {
    assert(false, `Test 8 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 9: Unauthorized role & status modification rejection
  // -------------------------------------------------------------------------
  console.log('\nTest 9: Unauthorized role & status modification rejection');
  try {
    // 1. Unauthenticated update attempt
    const resNoAuth = await fetch(
      `${baseUrl}/api/facilities/fac_lagos_island_001/memberships/mem_fac_lagos_island_001_adaezeokafor/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Suspended' }),
      }
    );
    assert(resNoAuth.status === 403, `Unauthenticated status update returns HTTP 403 (Got ${resNoAuth.status})`);

    // 2. Self-modification forbidden attempt
    const resSelf = await fetch(
      `${baseUrl}/api/facilities/fac_lagos_island_001/memberships/mem_fac_lagos_island_001_adaezeokafor/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-facility-id': 'fac_lagos_island_001',
          'x-admin-user-id': 'usr_clinician_demo', // Self trying to modify own status
        },
        body: JSON.stringify({ status: 'Suspended' }),
      }
    );
    const dataSelf = await resSelf.json();
    assert(resSelf.status === 403, `Self-modification returns HTTP 403 (Got ${resSelf.status})`);
    assert(dataSelf.code === 'SELF_MODIFICATION_FORBIDDEN', `Error code is SELF_MODIFICATION_FORBIDDEN (Got ${dataSelf.code})`);

    // 3. Unauthorized cross-facility admin attempt (admin of abuja trying to mutate lagos membership)
    const resCross = await fetch(
      `${baseUrl}/api/facilities/fac_lagos_island_001/memberships/mem_fac_lagos_island_001_adaezeokafor/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-facility-id': 'fac_abuja_national_002', // Wrong facility!
          'x-admin-user-id': 'usr_abj_admin_demo',
        },
        body: JSON.stringify({ status: 'Suspended' }),
      }
    );
    assert(resCross.status === 403, `Cross-facility admin status update returns HTTP 403 (Got ${resCross.status})`);
  } catch (err) {
    assert(false, `Test 9 threw error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // Test 10: Cross-facility patient access rejection
  // -------------------------------------------------------------------------
  console.log('\nTest 10: Cross-facility patient access rejection');
  try {
    // Clinician active in Lagos Lagoon attempts to access a patient belonging to Port Harcourt
    const resCross = await fetch(`${baseUrl}/api/clinical/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_clinician_demo',
        activeFacilityId: 'fac_lagos_island_001', // Active in Lagos
        patientFacilityId: 'fac_ph_riverside_003', // Target is Port Harcourt!
      }),
    });
    const dataCross = await resCross.json();
    assert(resCross.status === 403, `Cross-facility patient access returns HTTP 403 (Got ${resCross.status})`);
    assert(
      dataCross.code === 'CROSS_FACILITY_PATIENT_ACCESS_DENIED',
      `Error code is CROSS_FACILITY_PATIENT_ACCESS_DENIED (Got ${dataCross.code})`
    );

    // Active in Lagos accessing Lagos patient -> authorized
    const resValid = await fetch(`${baseUrl}/api/clinical/verify-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_clinician_demo',
        activeFacilityId: 'fac_lagos_island_001',
        patientFacilityId: 'fac_lagos_island_001',
      }),
    });
    const dataValid = await resValid.json();
    assert(resValid.status === 200, `Intra-facility patient access returns HTTP 200 (Got ${resValid.status})`);
    assert(dataValid.authorized === true, `Intra-facility access is authorized (Got ${dataValid.authorized})`);
  } catch (err) {
    assert(false, `Test 10 threw error: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');
  if (failCount > 0) {
    process.exit(1);
  }
}

runStage2BTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
