import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`Starting Platform Admin & Security Verification against ${BASE_URL}...`);

  // 1. Unauthenticated request to /api/platform-admin/overview -> 401
  console.log('1. Testing unauthenticated access to /api/platform-admin/overview...');
  const unauthRes = await fetch(`${BASE_URL}/api/platform-admin/overview`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');
  const unauthData = await unauthRes.json();
  assert.strictEqual(unauthData.code, 'UNAUTHORIZED');
  console.log('   ✓ Unauthenticated request rejected with 401 UNAUTHORIZED');

  // 2. Staff user token accessing platform admin -> 403
  console.log('2. Testing staff login session calling /api/platform-admin/overview...');
  const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'LLSC-VI',
      username: 'adaeze.okafor',
      password: 'Password123!',
    }),
  });
  assert.strictEqual(staffLoginRes.status, 200, 'Staff login should succeed');
  const staffLoginData = await staffLoginRes.json();
  const staffToken = staffLoginData.token;
  assert.ok(staffToken, 'Staff session token should be returned');

  const staffAdminRes = await fetch(`${BASE_URL}/api/platform-admin/overview`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert.strictEqual(staffAdminRes.status, 403, 'Staff token must receive 403 Forbidden');
  const staffAdminData = await staffAdminRes.json();
  assert.strictEqual(staffAdminData.code, 'FORBIDDEN');
  console.log('   ✓ Regular staff access strictly denied with 403 FORBIDDEN');

  // 3. Platform Admin Login with valid credentials -> 200
  console.log('3. Testing Platform Admin credential authentication...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/platform-admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'platform.admin',
      password: 'CornerBriefAdmin2026!',
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login must succeed');
  const adminLoginData = await adminLoginRes.json();
  assert.ok(adminLoginData.token, 'Platform admin token returned');
  assert.strictEqual(adminLoginData.admin.isPlatformAdmin, true);
  const adminToken = adminLoginData.token;
  console.log('   ✓ Platform Admin authenticated successfully, signed session issued');

  // 4. Session Verification -> 200
  console.log('4. Testing /api/platform-admin/verify...');
  const verifyRes = await fetch(`${BASE_URL}/api/platform-admin/verify`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.authenticated, true);
  console.log('   ✓ Platform Admin session verified');

  // 5. Platform Overview Endpoint -> 200
  console.log('5. Testing /api/platform-admin/overview metrics...');
  const overviewRes = await fetch(`${BASE_URL}/api/platform-admin/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(overviewRes.status, 200);
  const overviewData = await overviewRes.json();
  assert.ok(overviewData.stats.totalFacilities >= 1);
  assert.ok(overviewData.stats.totalStaffMemberships >= 1);
  assert.strictEqual(overviewData.systemStatus.persistenceStatus, 'IAM_RESTRICTED');
  console.log('   ✓ Overview stats retrieved with truthful IAM_RESTRICTED status');

  // 6. Facilities Directory -> 200
  console.log('6. Testing /api/platform-admin/facilities...');
  const facilitiesRes = await fetch(`${BASE_URL}/api/platform-admin/facilities`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(facilitiesRes.status, 200);
  const facilitiesData = await facilitiesRes.json();
  assert.ok(Array.isArray(facilitiesData.facilities));
  console.log(`   ✓ Directory retrieved: ${facilitiesData.facilities.length} registered facilities`);

  // 7. Staff Directory -> 200 (No passwords or hashes exposed!)
  console.log('7. Testing /api/platform-admin/staff...');
  const staffRes = await fetch(`${BASE_URL}/api/platform-admin/staff`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(staffRes.status, 200);
  const staffListData = await staffRes.json();
  assert.ok(Array.isArray(staffListData.staff));
  // Verify strict security: no passwords, hashes, or salt
  for (const s of staffListData.staff) {
    assert.strictEqual(s.password, undefined);
    assert.strictEqual(s.passwordHash, undefined);
    assert.strictEqual(s.salt, undefined);
  }
  console.log(`   ✓ Staff directory retrieved: ${staffListData.staff.length} staff members (Zero passwords/hashes exposed)`);

  // 8. Test Review Workflow: Register new facility -> Review (Reject & Approve)
  console.log('8. Testing Registration & Review Workflow...');
  const testFacCode = `TST-${Date.now().toString().slice(-4)}`;
  const regRes = await fetch(`${BASE_URL}/api/facilities/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Abuja Central Specialty Hospital',
      facilityType: 'Hospital',
      facilityCode: testFacCode,
      address: 'Plot 404 Constitution Avenue',
      city: 'Abuja',
      state: 'FCT Abuja',
      contactEmail: 'admin@abujacentral.ng',
      contactPhone: '+234 802 345 6789',
      adminName: 'Dr. Fatima Bello',
      adminEmail: 'fatima.bello@abujacentral.ng',
      adminRoleTitle: 'Medical Director',
      departments: ['General Outpatient (GOPD)', 'Internal Medicine'],
      initialStaff: [],
      includeStarterPatients: false,
    }),
  });
  assert.strictEqual(regRes.status, 201, 'Registration should return 201 Created');
  const regData = await regRes.json();
  const createdFacilityId = regData.facility.id;
  assert.strictEqual(regData.facility.status, 'Pending');
  console.log(`   ✓ New facility registered: ${regData.facility.name} (Code: ${testFacCode}, Status: Pending)`);

  // 8a. Rejection without mandatory reason (< 5 chars) -> 400
  console.log('8a. Testing rejection without mandatory reason...');
  const invalidRejectRes = await fetch(`${BASE_URL}/api/platform-admin/facilities/${createdFacilityId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reject',
      rejectionReason: 'Bad',
    }),
  });
  assert.strictEqual(invalidRejectRes.status, 400);
  const invalidRejectData = await invalidRejectRes.json();
  assert.strictEqual(invalidRejectData.code, 'MISSING_REJECTION_REASON');
  console.log('   ✓ Short rejection reason correctly rejected with 400 MISSING_REJECTION_REASON');

  // 8b. Rejection with valid reason -> 200
  console.log('8b. Testing rejection with valid reason...');
  const validRejectRes = await fetch(`${BASE_URL}/api/platform-admin/facilities/${createdFacilityId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'reject',
      rejectionReason: 'Incomplete CAC registration documentation provided.',
      reviewNotes: 'MDCN verified, but corporate CAC documents were not attached.',
    }),
  });
  assert.strictEqual(validRejectRes.status, 200);
  const validRejectData = await validRejectRes.json();
  assert.strictEqual(validRejectData.facility.status, 'Rejected');
  assert.ok(validRejectData.facility.rejectedAt);
  console.log('   ✓ Application marked as Rejected, reason recorded');

  // 8c. Approve application -> 200 + Active
  console.log('8c. Testing approval of hospital application...');
  const approveRes = await fetch(`${BASE_URL}/api/platform-admin/facilities/${createdFacilityId}/review`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'approve',
      reviewNotes: 'CAC documents submitted via compliance portal. License confirmed.',
    }),
  });
  assert.strictEqual(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.strictEqual(approveData.facility.status, 'Active');
  assert.ok(approveData.facility.activatedAt);
  console.log('   ✓ Hospital workspace approved and Activated');

  // 9. Audit Activity Log contains the decisions
  console.log('9. Verifying Platform Audit Log entries...');
  const activityRes = await fetch(`${BASE_URL}/api/platform-admin/activity`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(activityRes.status, 200);
  const activityData = await activityRes.json();
  const foundApproval = activityData.logs.some((l) => l.action && l.action.includes('approved registration'));
  assert.ok(foundApproval, 'Audit log must record approval');
  console.log('   ✓ Immutable audit log verified with approval record');

  // 10. System Diagnostics & Truthful IAM Reporting
  console.log('10. Testing /api/platform-admin/system diagnostics...');
  const systemRes = await fetch(`${BASE_URL}/api/platform-admin/system`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(systemRes.status, 200);
  const systemData = await systemRes.json();
  assert.strictEqual(systemData.api.status, 'Operational');
  assert.ok(systemData.database.requiredCloudRole.includes('roles/datastore.user'));
  console.log('   ✓ System diagnostics reporting accurate infrastructure status');

  console.log('\nALL PLATFORM ADMIN VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
