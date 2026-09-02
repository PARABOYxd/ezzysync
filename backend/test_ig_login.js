const { IgApiClient } = require('instagram-private-api');

async function testLogin() {
  const ig = new IgApiClient();
  const username = 'hikerskart';
  const password = 'Payaljain@02';
  
  ig.state.generateDevice(username);
  console.log('Step 1: Device generated');
  
  try {
    await ig.simulate.preLoginFlow();
    console.log('Step 2: preLoginFlow OK');
  } catch (e) {
    console.log('Step 2: preLoginFlow partial');
  }
  
  try {
    console.log('Step 3: Logging in...');
    const user = await ig.account.login(username, password);
    console.log('Step 3: LOGIN SUCCESS! PK:', user.pk);
    
    // Wait 5 seconds before trying inbox
    console.log('Step 4: Waiting 5 seconds before inbox fetch...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Post-login simulation
    try {
      await ig.simulate.postLoginFlow();
      console.log('Step 5: postLoginFlow OK');
    } catch (_) {
      console.log('Step 5: postLoginFlow partial (normal)');
    }
    
    // Wait another 3 seconds
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Step 6: Fetching inbox...');
    try {
      const inbox = ig.feed.directInbox();
      const threads = await inbox.records();
      console.log('Step 6: INBOX SUCCESS! Threads:', threads.length);
      for (const t of threads.slice(0, 5)) {
        const users = (t.users || []).map(u => u.username).join(', ');
        const lastMsg = t.items?.[0]?.text || t.items?.[0]?.item_type || '-';
        console.log('  Thread:', users, '| Last:', String(lastMsg).substring(0, 60));
      }
    } catch (e1) {
      console.log('Step 6: Inbox attempt 1 failed:', e1.message?.substring(0, 80));
      console.log('Waiting 10 more seconds...');
      await new Promise(r => setTimeout(r, 10000));
      
      try {
        console.log('Step 7: Retry inbox...');
        const inbox = ig.feed.directInbox();
        const threads = await inbox.records();
        console.log('Step 7: INBOX SUCCESS on retry! Threads:', threads.length);
        for (const t of threads.slice(0, 5)) {
          const users = (t.users || []).map(u => u.username).join(', ');
          const lastMsg = t.items?.[0]?.text || t.items?.[0]?.item_type || '-';
          console.log('  Thread:', users, '| Last:', String(lastMsg).substring(0, 60));
        }
      } catch (e2) {
        console.log('Step 7: Retry also failed:', e2.message?.substring(0, 100));
        console.log('>>> 467 = Instagram temporary rate-limit. Try again in a few minutes.');
      }
    }
  } catch (loginErr) {
    console.error('LOGIN FAILED:', loginErr.message?.substring(0, 200));
  }
}

testLogin().catch(e => console.error('Fatal:', e));
