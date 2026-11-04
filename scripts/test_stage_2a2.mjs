import fetch from 'node-fetch';

async function runDiagnostics() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- 1. Testing Code Availability Endpoint ---');
  const res1 = await fetch(baseUrl + '/api/facilities/check-code/LLSC-VI');
  const data1 = await res1.json();
  console.log('GET /api/facilities/check-code/LLSC-VI ->', res1.status, data1);

  const res2 = await fetch(baseUrl + '/api/facilities/check-code/NEW-HOSP-99');
  const data2 = await res2.json();
  console.log('GET /api/facilities/check-code/NEW-HOSP-99 ->', res2.status, data2);

  const res3 = await fetch(baseUrl + '/api/facilities/check-code/invalid_code!');
  const data3 = await res3.json();
  console.log('GET /api/facilities/check-code/invalid_code! ->', res3.status, data3);

  console.log('\n--- 2. Testing Facility Registration Persistence Gate ---');
  const regPayload = {
    name: 'Verification Test Medical Center',
    facilityType: 'Hospital',
    facilityCode: 'TEST-FAC-01',
    address: '10 Verification Road',
    city: 'Lagos',
    state: 'Lagos State',
    contactEmail: 'contact@testfac01.ng',
    contactPhone: '+234 801 111 2222',
    adminName: 'Dr. Test Administrator',
    adminEmail: 'admin@testfac01.ng',
    adminRoleTitle: 'Medical Director',
    departments: ['General Outpatient (GOPD)', 'Emergency & Trauma'],
    initialStaff: [],
  };

  const regRes = await fetch(baseUrl + '/api/facilities/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload),
  });
  const regData = await regRes.json();
  console.log('POST /api/facilities/register -> HTTP', regRes.status, regData);

  console.log('\n--- 3. Testing Duplicate Code Conflict (409) ---');
  const dupPayload = { ...regPayload, facilityCode: 'LLSC-VI' };
  const dupRes = await fetch(baseUrl + '/api/facilities/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dupPayload),
  });
  const dupData = await dupRes.json();
  console.log('POST /api/facilities/register (existing code LLSC-VI) -> HTTP', dupRes.status, dupData);

  console.log('\n--- 4. Testing Status PATCH Endpoint Authentication Guard ---');
  const patchResNoAuth = await fetch(baseUrl + '/api/facilities/fac_test/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Active' }),
  });
  const patchDataNoAuth = await patchResNoAuth.json();
  console.log('PATCH /api/facilities/fac_test/status (no auth) -> HTTP', patchResNoAuth.status, patchDataNoAuth);

  const patchResBadToken = await fetch(baseUrl + '/api/facilities/fac_test/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer bogus-token-12345',
    },
    body: JSON.stringify({ status: 'Active' }),
  });
  const patchDataBadToken = await patchResBadToken.json();
  console.log('PATCH /api/facilities/fac_test/status (bogus token) -> HTTP', patchResBadToken.status, patchDataBadToken);

  console.log('\n--- 5. Testing Rate Limiter ---');
  let hitRateLimit = false;
  for (let i = 0; i < 25; i++) {
    const rlRes = await fetch(baseUrl + '/api/facilities/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...regPayload, facilityCode: `RATE-${i}` }),
    });
    if (rlRes.status === 429) {
      const rlData = await rlRes.json();
      console.log(`Request ${i + 1} triggered Rate Limit: HTTP 429`, rlData);
      hitRateLimit = true;
      break;
    }
  }
  if (!hitRateLimit) {
    console.log('Rate limit not hit within 25 requests');
  }
}

runDiagnostics().catch(console.error);
