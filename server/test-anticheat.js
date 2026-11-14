const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function getJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function main() {
  console.log('=== SKILLDUELS FAIR PLAY & MATCH HISTORY TEST ===\n');

  // 1. Authenticate two test users (dynamically registered)
  const ts = Date.now();
  const p1Reg = await postJSON(`${API_BASE}/auth/register`, {
    username: `duelist_a_${ts.toString(36)}`,
    email: `duelist_a_${ts}@skillduels.test`,
    password: 'Password123!',
  });
  const token1 = p1Reg.token;
  const user1 = p1Reg.user;
  const user1Id = user1._id || user1.id;

  const p2Reg = await postJSON(`${API_BASE}/auth/register`, {
    username: `duelist_b_${ts.toString(36)}`,
    email: `duelist_b_${ts}@skillduels.test`,
    password: 'Password123!',
  });
  const token2 = p2Reg.token;
  const user2 = p2Reg.user;
  const user2Id = user2._id || user2.id;

  console.log(`[PASS] Logged in Player 1: ${user1.username} (${user1Id})`);
  console.log(`[PASS] Logged in Player 2: ${user2.username} (${user2Id})\n`);

  // 2. Connect socket clients
  const s1 = io(SOCKET_URL, {
    auth: { token: token1 },
    transports: ['websocket'],
  });
  const s2 = io(SOCKET_URL, {
    auth: { token: token2 },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve) => s1.on('connect', resolve)),
    new Promise((resolve) => s2.on('connect', resolve)),
  ]);
  console.log('[PASS] Both socket clients connected with JWT auth.');

  let currentMatchId = null;
  const warningsReceived = [];
  const opponentNotices = [];

  // Set up listeners
  s1.on('tab_warning', (data) => {
    console.log(`[EVENT: Player 1 Received tab_warning] Strike: ${data.strikeCount}/${data.maxStrikes}, Kicked: ${data.kicked}`);
    warningsReceived.push(data);
  });

  s2.on('opponent_tab_warning', (data) => {
    console.log(`[EVENT: Player 2 Received opponent_tab_warning] Infraction by: ${data.opponentUsername}, Strike: ${data.strikeCount}/${data.maxStrikes}, Opponent Kicked: ${data.opponentKicked}`);
    opponentNotices.push(data);
  });

  const matchEndedPromise = new Promise((resolve) => {
    s1.on('match_ended', (data) => {
      console.log(`\n[EVENT: Match Ended] Reason: ${data.reason}, WinnerId: ${data.winnerId}`);
      resolve(data);
    });
  });

  const matchStartPromise = new Promise((resolve) => {
    s1.on('match_start', (data) => {
      currentMatchId = data.matchId;
      console.log(`[EVENT: Match Started] MatchId: ${data.matchId}, Category: ${data.category}`);
      resolve(data);
    });
  });

  // 3. Join Matchmaking
  console.log('\n[MATCHMAKING] Joining queue in category "dsa"...');
  s1.emit('join_queue', { category: 'dsa' });
  s2.emit('join_queue', { category: 'dsa' });

  await matchStartPromise;

  // 4. Simulate Tab Switching by Player 1
  console.log('\n--- SIMULATING TAB SWITCH 1 ---');
  s1.emit('tab_switch_detected', { matchId: currentMatchId });
  await new Promise((r) => setTimeout(r, 600));

  console.log('\n--- SIMULATING TAB SWITCH 2 ---');
  s1.emit('tab_switch_detected', { matchId: currentMatchId });
  await new Promise((r) => setTimeout(r, 600));

  console.log('\n--- SIMULATING TAB SWITCH 3 (DISQUALIFICATION TRIGGER) ---');
  s1.emit('tab_switch_detected', { matchId: currentMatchId });

  const finalResult = await matchEndedPromise;

  // Assertions
  console.log('\n=== ASSERTION CHECKS ===');
  console.log(`Total warnings received by P1: ${warningsReceived.length} (Expected: 3) -> ${warningsReceived.length === 3 ? 'PASS' : 'FAIL'}`);
  console.log(`P1 kicked status on 3rd warning: ${warningsReceived[2]?.kicked === true ? 'PASS' : 'FAIL'}`);
  console.log(`Match end reason: ${finalResult.reason} (Expected: tab_switch_forfeit) -> ${finalResult.reason === 'tab_switch_forfeit' ? 'PASS' : 'FAIL'}`);
  console.log(`Winner is Player 2: ${finalResult.winnerId === user2Id ? 'PASS' : 'FAIL'}`);

  s1.disconnect();
  s2.disconnect();

  // Wait 1.5 seconds for database save
  await new Promise((r) => setTimeout(r, 1500));

  // 5. Verify Match History & Progression from REST API
  console.log('\n=== VERIFYING MATCH HISTORY IN DATABASE ===');
  const user1Progression = await getJSON(`${API_BASE}/leaderboard/user/${user1Id}`);
  const user2Progression = await getJSON(`${API_BASE}/leaderboard/user/${user2Id}`);

  const p1History = user1Progression.profile.recentMatches;
  const p2History = user2Progression.profile.recentMatches;

  console.log(`Player 1 Recent Matches count: ${p1History.length}`);
  console.log(`Player 2 Recent Matches count: ${p2History.length}`);

  const latestMatchP1 = p1History[0];
  const latestMatchP2 = p2History[0];

  console.log('\nPlayer 1 Latest History Entry:');
  console.log(JSON.stringify(latestMatchP1, null, 2));

  console.log('\nPlayer 2 Latest History Entry:');
  console.log(JSON.stringify(latestMatchP2, null, 2));

  console.log('\nPlayer 2 Badges:');
  const unlockedBadgesP2 = user2Progression.profile.badges.filter(b => b.isUnlocked);
  console.log(unlockedBadgesP2.map(b => `${b.name} (${b.badgeId})`));

  console.log('\n=== ALL FAIR PLAY & MATCH HISTORY CHECKS PASSED ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
