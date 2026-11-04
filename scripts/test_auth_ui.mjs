import fs from 'node:fs';
import path from 'node:path';

async function waitForServer(retries = 30, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/health');
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('CORNERBRIEF — AUTHENTICATION UI & RESPONSIVE FLOW VERIFICATION');
  console.log('================================================================\n');

  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error('Dev server is not reachable on http://127.0.0.1:3000');
    process.exit(1);
  }

  // --- CHECKPOINT 1: GOOGLE SIGN-IN REMOVED FROM AUTH UI ---
  console.log('--- 1. VERIFY GOOGLE SIGN-IN REMOVAL FROM CLIENT UI ---');
  const loginScreenPath = path.resolve('src/components/LoginScreen.tsx');
  const loginScreenContent = fs.readFileSync(loginScreenPath, 'utf8');

  assert(!loginScreenContent.includes('onGoogleSignIn'), 'onGoogleSignIn prop removed from LoginScreenProps');
  assert(!loginScreenContent.includes('Continue with Google Workspace'), 'Google Workspace button text removed');
  assert(!loginScreenContent.includes('authMethod'), 'authMethod tab state removed');
  assert(!loginScreenContent.includes('googleProvider'), 'No direct googleProvider reference in LoginScreen');
  assert(!loginScreenContent.includes('Sign in with Google'), 'No "Sign in with Google" text anywhere in LoginScreen');
  assert(loginScreenContent.includes('Hospital Staff Sign-In'), 'Login card explicitly features dedicated Hospital Staff Sign-In');

  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(!appContent.includes('onGoogleSignIn={'), 'LoginScreen in App.tsx does not receive onGoogleSignIn prop');

  // --- CHECKPOINT 2: PLATFORM ADMIN SEPARATE BACKEND AUTHORIZATION PRESERVED ---
  console.log('\n--- 2. VERIFY PLATFORM ADMIN BACKEND CALLER AUTHORIZATION ---');
  const resAdminVerify = await fetch('http://127.0.0.1:3000/api/admin/verify-caller', {
    headers: { Authorization: 'Bearer invalid_or_missing_token' },
  });
  assert(resAdminVerify.status === 401, 'Unauthenticated or invalid token to verify-caller returns 401');

  // --- CHECKPOINT 3: PUBLIC LANDING PAGE ENTRY POINTS ---
  console.log('\n--- 3. VERIFY PUBLIC LANDING PAGE ENTRY POINTS ---');
  assert(loginScreenContent.includes('Sign In to Workspace'), 'Prominent primary "Sign In to Workspace" hero button');
  assert(loginScreenContent.includes('Register Your Facility'), 'Prominent secondary "Register Your Facility" hero button');
  assert(loginScreenContent.includes('onOpenRegisterFacility'), 'Register Your Facility button wired to registration modal');

  // --- CHECKPOINT 4: STAFF LOGIN INTERFACE & TOUCH ACCESSIBILITY ---
  console.log('\n--- 4. VERIFY STAFF LOGIN INTERFACE & TOUCH TARGET SIZING ---');
  assert(loginScreenContent.includes('Hospital Code'), 'Hospital Code field label present');
  assert(loginScreenContent.includes('LLSC-VI'), 'Quick-select pill for LLSC-VI present');
  assert(loginScreenContent.includes('ACCH-ABJ'), 'Quick-select pill for ACCH-ABJ present');
  assert(loginScreenContent.includes('PRMC-PHC'), 'Quick-select pill for PRMC-PHC present');
  assert(loginScreenContent.includes("showPassword ? 'text' : 'password'"), 'Show/hide password toggle implemented');
  assert(loginScreenContent.includes('Forgot Password?'), 'Forgot password modal trigger present');
  assert(loginScreenContent.includes('min-h-[44px]'), 'Submit button has >= 44px min-height for touch compliance');
  assert(loginScreenContent.includes('py-3.5') || loginScreenContent.includes('py-3'), 'Form inputs have touch-friendly vertical padding');

  // --- CHECKPOINT 5: BACKEND STAFF AUTHENTICATION (POST /api/auth/login) ---
  console.log('\n--- 5. VERIFY STAFF LOGIN BACKEND AUTHENTICATION ---');
  // 5A: Valid doctor credentials
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'LLSC-VI',
      username: 'adaeze.okafor',
      password: 'Password123!',
    }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'Valid login returns HTTP 200');
  assert(loginData.success === true, 'Response success is true');
  assert(loginData.membership.facilityCode === 'LLSC-VI', 'Membership correctly linked to LLSC-VI');
  assert(loginData.membership.role === 'Doctor', 'Role resolved as Doctor');
  assert(loginData.facility.name === 'Lagos Lagoon Specialist Centre', 'Facility object returned');
  assert(Boolean(loginData.session?.token), 'Signed session token returned');

  // 5B: Verify that staff session strictly CANNOT acquire PlatformAdmin rights
  const staffVerifyRes = await fetch('http://127.0.0.1:3000/api/admin/verify-caller', {
    headers: { Authorization: `Bearer ${loginData.session.token}` },
  });
  const staffVerifyData = await staffVerifyRes.json();
  assert(staffVerifyRes.status === 200, 'Staff session can query verify-caller');
  assert(staffVerifyData.isPlatformAdmin === false, 'Staff session is strictly isPlatformAdmin: false');

  // 5C: Invalid credentials
  const invalidLoginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'LLSC-VI',
      username: 'adaeze.okafor',
      password: 'WrongPassword999!',
    }),
  });
  assert(invalidLoginRes.status === 401, 'Invalid password returns HTTP 401');

  // 5D: Logout
  const cookieHeader = loginRes.headers.get('set-cookie');
  const logoutRes = await fetch('http://127.0.0.1:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      Cookie: cookieHeader || '',
      Authorization: `Bearer ${loginData.session.token}`,
    },
  });
  assert(logoutRes.status === 200, 'Staff logout endpoint returns HTTP 200');

  // --- CHECKPOINT 6: FACILITY REGISTRATION INTEGRATION & PENDING SCREEN ---
  console.log('\n--- 6. VERIFY FACILITY REGISTRATION ENDPOINT & MODAL FLOW ---');
  const modalPath = path.resolve('src/components/FacilityOnboardingModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf8');

  assert(modalContent.includes('/api/facilities/register'), 'Connected to POST /api/facilities/register');
  assert(modalContent.includes('STATUS: PENDING REVIEW'), 'Pending Review badge rendered in confirmation');
  assert(modalContent.includes('Controlled Activation Lifecycle'), 'Controlled activation governance notice present');
  assert(modalContent.includes('Storage &amp; Persistence Status'), 'Truthful storage & persistence breakdown rendered');
  assert(modalContent.includes('min-h-[44px]'), 'Touch target >= 44px on all action buttons');
  assert(modalContent.includes('flex flex-col-reverse sm:flex-row'), 'Responsive stacked buttons on mobile');

  const testCode = `CASH-${Date.now().toString().slice(-4)}`;
  const regRes = await fetch('http://127.0.0.1:3000/api/facilities/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Calabar Apex Specialist Hospital',
      facilityType: 'Hospital',
      facilityCode: testCode,
      address: '45 Mary Slessor Avenue',
      city: 'Calabar',
      state: 'Cross River State',
      contactEmail: 'admin@calabarapex.ng',
      contactPhone: '+234 802 334 5566',
      adminName: 'Dr. Edet Bassey',
      adminEmail: 'edet.bassey@calabarapex.ng',
      adminRoleTitle: 'Chief Medical Director',
      departments: ['General Outpatient (GOPD)', 'Internal Medicine', 'Emergency & Acute Care'],
      initialStaff: [],
      includeStarterPatients: true,
    }),
  });
  const regData = await regRes.json();
  assert(
    regRes.status === 201,
    `Registration successfully returns HTTP 201 Created (got ${regRes.status})`
  );
  assert(
    regData.success === true && regData.status === 'Pending',
    'Registration returns success: true and status: Pending'
  );
  assert(
    regData.persistedToFirestore === false,
    'Registration truthfully reports persistedToFirestore: false due to known IAM configuration'
  );
  assert(
    Boolean(regData.facility?.facilityCode),
    `Assigned unique Hospital Code: ${regData.facility?.facilityCode}`
  );

  // --- CHECKPOINT 7: SUSPENDED / INACTIVE / UNAPPROVED FACILITY CANNOT LOG IN ---
  console.log('\n--- 7. VERIFY UNAPPROVED/SUSPENDED FACILITY ACCESS ENFORCEMENT ---');
  const suspendedLoginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'SUSP-FAC',
      username: 'suspended.admin',
      password: 'Password123!',
    }),
  });
  assert(suspendedLoginRes.status === 403, 'Inactive/Suspended facility login is blocked with HTTP 403 Forbidden');
  const suspendedLoginData = await suspendedLoginRes.json();
  assert(suspendedLoginData.code === 'FACILITY_NOT_ACTIVE', 'Blocked with code FACILITY_NOT_ACTIVE');

  // --- CHECKPOINT 8: FORGOT PASSWORD MODAL ---
  console.log('\n--- 8. VERIFY FORGOT PASSWORD INSTITUTIONAL MODAL ---');
  assert(loginScreenContent.includes('Hospital Credential Assistance'), 'Hospital Credential Assistance modal header present');
  assert(loginScreenContent.includes('Facility Administrator'), 'Direct guidance to contact Facility Administrator');
  assert(loginScreenContent.includes('setShowRecoveryModal(false)'), 'Dismiss handler for forgot password modal present');

  console.log('\n================================================================');
  console.log(`AUTHENTICATION UI VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
