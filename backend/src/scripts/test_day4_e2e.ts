import { io, Socket } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  step: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordResult(step: string, passed: boolean, details: string) {
  results.push({ step, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${step}: ${details}`);
}

async function runDay4DeepTest() {
  console.log('\n======================================================');
  console.log('🚀 STARTING DAY 4 DEEP AUTOMATED END-TO-END QA SUITE');
  console.log('======================================================\n');

  let aliceSocket: Socket | null = null;
  let bobSocket: Socket | null = null;

  try {
    // ----------------------------------------------------
    // TEST 1: User Logins (Alice & Bob & Charlie)
    // ----------------------------------------------------
    console.log('>>> [1/7] Testing Authentication (Alice, Bob, Charlie)...');
    
    const loginUser = async (email: string) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(`Failed to login ${email}: ${JSON.stringify(data)}`);
      }
      return data.data; // { token, user }
    };

    const aliceAuth = await loginUser('alice@example.com');
    const bobAuth = await loginUser('bob@example.com');
    const charlieAuth = await loginUser('charlie@example.com');

    const aliceId = aliceAuth.user.id || aliceAuth.user._id;
    const bobId = bobAuth.user.id || bobAuth.user._id;
    const charlieId = charlieAuth.user.id || charlieAuth.user._id;

    recordResult('Authentication', true, `Alice (${aliceId}), Bob (${bobId}), Charlie (${charlieId}) logged in successfully.`);

    // ----------------------------------------------------
    // TEST 2: Real-time Socket.IO Connection with JWT
    // ----------------------------------------------------
    console.log('\n>>> [2/7] Testing WebSocket Connection with JWT Handshake...');
    
    const connectUserSocket = (token: string, name: string): Promise<Socket> => {
      return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false
        });

        socket.on('connect', () => {
          resolve(socket);
        });

        socket.on('connect_error', (err) => {
          reject(new Error(`${name} socket connection error: ${err.message}`));
        });
      });
    };

    aliceSocket = await connectUserSocket(aliceAuth.token, 'Alice');
    bobSocket = await connectUserSocket(bobAuth.token, 'Bob');

    // Allow presence and user room initialization
    await new Promise((r) => setTimeout(r, 500));

    recordResult('WebSocket Handshake', true, `Alice (socket ${aliceSocket.id}) & Bob (socket ${bobSocket.id}) connected & joined user rooms.`);

    // ----------------------------------------------------
    // TEST 3: Group Creation & Real-Time Socket Broadcast
    // ----------------------------------------------------
    console.log('\n>>> [3/7] Testing Group Creation & Real-Time Event...');

    const groupCreatedPromise = new Promise<{ chat: any; group: any }>((resolve) => {
      bobSocket!.on('group:created', (payload: any) => {
        resolve(payload);
      });
    });

    const createGroupRes = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAuth.token}`
      },
      body: JSON.stringify({
        name: 'Deep QA Sprint Squad',
        description: 'Automated test suite group for Day 4',
        avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c',
        memberIds: [aliceId, bobId]
      })
    });

    const createGroupData = await createGroupRes.json();
    if (!createGroupRes.ok || !createGroupData.success) {
      throw new Error(`Group creation failed: ${JSON.stringify(createGroupData)}`);
    }

    const createdGroup = createGroupData.data;
    const chatId = createdGroup.chatId;
    const groupId = createdGroup._id;

    recordResult('Group Creation REST API', true, `Group "${createdGroup.name}" created (GroupID: ${groupId}, ChatID: ${chatId})`);

    // Wait for Bob's socket to receive 'group:created' (with 4-second timeout)
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for group:created socket event')), 4000));
    try {
      const socketPayload = await Promise.race([groupCreatedPromise, timeoutPromise]);
      recordResult('Real-Time "group:created" Event', true, `Bob received live group:created event for group ID ${(socketPayload as any)?._id || groupId}`);
    } catch (e: any) {
      recordResult('Real-Time "group:created" Event', false, e.message);
    }

    // ----------------------------------------------------
    // TEST 4: Group Messaging (Join Room, Send & Receive Live)
    // ----------------------------------------------------
    console.log('\n>>> [4/7] Testing Group Messaging & Live Delivery...');

    aliceSocket.emit('chat:join', { chatId });
    bobSocket.emit('chat:join', { chatId });

    // Wait 500ms for rooms to register
    await new Promise((r) => setTimeout(r, 500));

    const messageReceivedPromise = new Promise<any>((resolve) => {
      bobSocket!.on('message:created', (msg: any) => {
        resolve(msg);
      });
    });

    // Alice sends message in group via socket
    const tempId = `temp-${Date.now()}`;
    const testMessageText = 'Hello Bob, Day 4 automated group messaging verification!';
    aliceSocket.emit('message:send', {
      chatId,
      text: testMessageText,
      tempId
    });

    try {
      const receivedMsg = await Promise.race([
        messageReceivedPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for message:created')), 4000))
      ]);
      const isTextMatch = (receivedMsg as any).text === testMessageText;
      const senderName = (receivedMsg as any).senderId?.name || (receivedMsg as any).senderId;
      recordResult(
        'Group Messaging Live Delivery',
        isTextMatch,
        `Bob received live message: "${(receivedMsg as any).text}" from sender: ${senderName}`
      );
    } catch (e: any) {
      recordResult('Group Messaging Live Delivery', false, e.message);
    }

    // ----------------------------------------------------
    // TEST 5: Group Info & Admin Operations (Add/Remove Members)
    // ----------------------------------------------------
    console.log('\n>>> [5/7] Testing Group Info & Admin Operations...');

    // 5.1 Fetch Group Info
    const groupInfoRes = await fetch(`${BASE_URL}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${aliceAuth.token}` }
    });
    const groupInfoData = await groupInfoRes.json();
    const groupDoc = groupInfoData.data;

    const aliceMember = groupDoc?.members?.find((m: any) => {
      const mId = typeof m.userId === 'object' && m.userId !== null ? (m.userId._id || m.userId.id) : m.userId;
      return mId === aliceId;
    });

    const isAliceAdmin = aliceMember?.role === 'admin';
    recordResult('Group Info & Admin Role Check', isAliceAdmin, `Group retrieved. Alice role is "${aliceMember?.role}". Total members: ${groupDoc?.members?.length}`);

    // 5.2 Admin adds Charlie to Group
    const addMemberRes = await fetch(`${BASE_URL}/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAuth.token}`
      },
      body: JSON.stringify({ memberIds: [charlieId] })
    });
    const addMemberData = await addMemberRes.json();
    const hasCharlie = addMemberData?.data?.members?.some((m: any) => {
      const mId = typeof m.userId === 'object' && m.userId !== null ? (m.userId._id || m.userId.id) : m.userId;
      return mId === charlieId;
    });
    recordResult('Admin Add Member (POST /api/groups/:id/members)', !!hasCharlie, `Charlie added by admin Alice. Members count is now: ${addMemberData?.data?.members?.length}`);

    // 5.3 Admin removes Charlie from Group
    const removeMemberRes = await fetch(`${BASE_URL}/api/groups/${groupId}/members/${charlieId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${aliceAuth.token}` }
    });
    const removeMemberData = await removeMemberRes.json();
    const charlieStillExists = removeMemberData?.data?.members?.some((m: any) => {
      const mId = typeof m.userId === 'object' && m.userId !== null ? (m.userId._id || m.userId.id) : m.userId;
      return mId === charlieId;
    });
    recordResult('Admin Remove Member (DELETE /api/groups/:id/members/:userId)', !charlieStillExists, `Charlie removed by admin Alice. Members count: ${removeMemberData?.data?.members?.length}`);

    // ----------------------------------------------------
    // TEST 6: User Profile Management (Self Update & View Other)
    // ----------------------------------------------------
    console.log('\n>>> [6/7] Testing Profile Management...');

    // 6.1 Alice updates her profile
    const updatedBio = `Senior Lead UI Engineer - QA Tested at ${new Date().toLocaleTimeString()}`;
    const patchProfileRes = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceAuth.token}`
      },
      body: JSON.stringify({
        name: 'Alice Johnson (QA Lead)',
        about: updatedBio
      })
    });
    const patchProfileData = await patchProfileRes.json();
    const isProfileUpdated = patchProfileData?.data?.about === updatedBio;
    recordResult('Profile Self-Update (PATCH /api/users/me)', isProfileUpdated, `Alice updated name to "${patchProfileData?.data?.name}" and bio to "${patchProfileData?.data?.about}"`);

    // 6.2 Bob views Alice's updated public profile
    const viewAliceProfileRes = await fetch(`${BASE_URL}/api/users/${aliceId}`, {
      headers: { Authorization: `Bearer ${bobAuth.token}` }
    });
    const viewAliceProfileData = await viewAliceProfileRes.json();
    const isViewMatch = viewAliceProfileData?.data?.about === updatedBio;
    recordResult('View Other User Profile (GET /api/users/:userId)', isViewMatch, `Bob fetched Alice's public profile: Name: "${viewAliceProfileData?.data?.name}", Bio: "${viewAliceProfileData?.data?.about}"`);

    // ----------------------------------------------------
    // TEST 7: Media / File Upload Engine (POST /api/upload)
    // ----------------------------------------------------
    console.log('\n>>> [7/7] Testing Media Upload Engine...');

    const sampleText = 'This is an automated test attachment file for Day 4 deep QA verification.';
    const formData = new FormData();
    const blob = new Blob([sampleText], { type: 'text/plain' });
    formData.append('file', blob, 'test_attachment.txt');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${aliceAuth.token}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    const hasStorageUrl = !!uploadData?.data?.storageUrl;
    recordResult('Media Upload Engine (POST /api/upload)', hasStorageUrl, `File uploaded successfully. Storage URL: ${uploadData?.data?.storageUrl}`);

    // Verify static file delivery
    if (hasStorageUrl) {
      const fileFetchRes = await fetch(uploadData.data.storageUrl);
      const isFileReachable = fileFetchRes.ok;
      recordResult('Static File Serving (/uploads)', isFileReachable, `Uploaded file reachable over HTTP GET (Status: ${fileFetchRes.status})`);
    }

    // Summary
    console.log('\n======================================================');
    console.log('📊 FINAL TEST RESULTS SUMMARY:');
    console.log('======================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    results.forEach((r, idx) => {
      console.log(`[${idx + 1}/${total}] ${r.passed ? '✅ PASS' : '❌ FAIL'}: ${r.step} - ${r.details}`);
    });

    console.log('\n------------------------------------------------------');
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Unhandled Test Suite Failure:', error.message);
    process.exit(1);
  } finally {
    if (aliceSocket) aliceSocket.disconnect();
    if (bobSocket) bobSocket.disconnect();
  }
}

runDay4DeepTest();
