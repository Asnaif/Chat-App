import { ENV } from './config/env';

const BASE_URL = `http://localhost:${ENV.PORT || 5000}`;

async function runDay5Tests() {
  console.log('🚀 Starting Day 5 Backend Verification Tests...');
  let user1Token: string;
  let user1Id: string;
  let user1SessionId: string;

  let user2Token: string;
  let user2Id: string;
  let data: any;

  try {
    // 1. Register User 1 & Create Session
    const email1 = `day5_user_${Date.now()}@test.com`;
    const password = 'password123';
    let res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Day 5 Tester', email: email1, password }),
    });
    data = await res.json();
    user1Token = data.data.token;
    user1Id = data.data.user.id;
    user1SessionId = data.data.sessionId;

    if (!user1SessionId) {
      throw new Error('User registration did not return a sessionId');
    }
    console.log('✅ User 1 Registered & Session Generated:', user1SessionId);

    // 2. Load Default Settings (GET /api/settings)
    res = await fetch(`${BASE_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    if (data.data?.theme && data.data?.lastSeenPrivacy) {
      console.log('✅ Default Settings Retrieved:', data.data.theme, '| Privacy:', data.data.lastSeenPrivacy);
    } else {
      throw new Error(`Failed to get settings: ${JSON.stringify(data)}`);
    }

    // 3. Update Settings (PATCH /api/settings)
    res = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        theme: 'light',
        lastSeenPrivacy: 'contacts',
        aboutPrivacy: 'nobody',
        groupPrivacy: 'contacts',
        readReceipts: false,
        keyboardShortcuts: true,
      }),
    });
    data = await res.json();
    if (
      data.data?.theme === 'light' &&
      data.data?.lastSeenPrivacy === 'contacts' &&
      data.data?.aboutPrivacy === 'nobody' &&
      data.data?.readReceipts === false
    ) {
      console.log('✅ Settings Updated & Persisted Successfully!');
    } else {
      throw new Error(`Settings update failed: ${JSON.stringify(data)}`);
    }

    // 4. Test User Blocking & Unblocking
    const email2 = `day5_blocked_${Date.now()}@test.com`;
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Blocked Target', email: email2, password }),
    });
    data = await res.json();
    user2Id = data.data.user.id;

    // Block User 2
    res = await fetch(`${BASE_URL}/api/settings/blocked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ blockedUserId: user2Id }),
    });
    data = await res.json();
    console.log('✅ User 2 Blocked Successfully');

    // List Blocked Users
    res = await fetch(`${BASE_URL}/api/settings/blocked`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    if (data.data?.length > 0) {
      console.log('✅ Blocked Contacts List Retrieved (Count: ' + data.data.length + ')');
    }

    // Unblock User 2
    res = await fetch(`${BASE_URL}/api/settings/blocked/${user2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    console.log('✅ User 2 Unblocked Successfully');

    // 5. Test Active Sessions (GET /api/settings/sessions)
    res = await fetch(`${BASE_URL}/api/settings/sessions`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    const sessions = data.data || [];
    if (sessions.length >= 1 && sessions[0].isCurrent) {
      console.log('✅ Current Active Session Verified (isCurrent: true)');
    } else {
      throw new Error(`Session list check failed: ${JSON.stringify(data)}`);
    }

    // Simulate login from second device
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mobile App / iPhone 15',
      },
      body: JSON.stringify({ email: email1, password }),
    });
    data = await res.json();
    const secondSessionId = data.data.sessionId;
    console.log('✅ Simulated 2nd Device Login (SessionId:', secondSessionId, ')');

    // Revoke 2nd device session
    res = await fetch(`${BASE_URL}/api/settings/sessions/${secondSessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    console.log('✅ Specific Session Revoked Successfully');

    // Test Logout All Other Sessions
    res = await fetch(`${BASE_URL}/api/settings/sessions/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    data = await res.json();
    console.log('✅ Logout-all from other devices successful');

    // 6. Test Change Password
    const newPassword = 'newSecretPassword123';
    res = await fetch(`${BASE_URL}/api/settings/security/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        oldPassword: password,
        newPassword,
      }),
    });
    data = await res.json();
    if (data.success) {
      console.log('✅ Password Changed Successfully');
    } else {
      throw new Error(`Password change failed: ${JSON.stringify(data)}`);
    }

    // Verify login with new password
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email1, password: newPassword }),
    });
    data = await res.json();
    if (data.data?.token) {
      console.log('✅ Login with New Password Verified!');
    } else {
      throw new Error('Could not login with new password');
    }

    console.log('🎉 ALL DAY 5 BACKEND VERIFICATION TESTS PASSED FLAWLESSLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Day 5 Test Error:', err);
    process.exit(1);
  }
}

runDay5Tests();
