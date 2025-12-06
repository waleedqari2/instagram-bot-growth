import { IgApiClient } from 'instagram-private-api';
import { readFileSync } from 'fs';

async function testSessionImport() {
  try {
    console.log('Loading session file...');
    const sessionFile = readFileSync('./test_session.json', 'utf-8');
    const sessionData = JSON.parse(sessionFile);
    
    console.log('Session data loaded:', {
      username: sessionData.username,
      hasAuthData: !!sessionData.authorization_data,
      sessionid: sessionData.authorization_data?.sessionid?.substring(0, 20) + '...',
    });
    
    const ig = new IgApiClient();
    
    // Set device settings from session
    const sessionObj = sessionData.session_data || sessionData;
    const authData = sessionData.authorization_data || sessionObj.authorization_data;
    
    if (sessionObj.uuids) {
      ig.state.deviceId = sessionObj.uuids.android_device_id || '';
      ig.state.uuid = sessionObj.uuids.uuid || '';
      ig.state.phoneId = sessionObj.uuids.phone_id || '';
      ig.state.adid = sessionObj.uuids.advertising_id || '';
      console.log('Device IDs set');
    }
    
    if (authData && authData.sessionid) {
      // Try to set cookies
      console.log('Setting cookies...');
      ig.state.cookieJar.setCookie(`ds_user_id=${authData.ds_user_id}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
      ig.state.cookieJar.setCookie(`sessionid=${authData.sessionid}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
    }
    
    // Try to get current user
    console.log('Verifying session...');
    const user = await ig.account.currentUser();
    console.log('✅ Success! Logged in as:', user.username);
    console.log('User ID:', user.pk);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testSessionImport();
