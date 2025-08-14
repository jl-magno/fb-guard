const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const activeSessions = new Map();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/guard', async (req, res) => {
  const { cookie, action } = req.body;
  
  if (!cookie || !action) {
    return res.status(400).json({ error: 'Missing appstate or action' });
  }

  try {
    const cookies = await convertCookie(cookie);
    if (!cookies) {
      return res.status(400).json({ error: 'Invalid appstate' });
    }

    const profileId = await getProfileId(cookies);
    
    if (action === 'activate') {
      // Start protection
      activeSessions.set(profileId, {
        status: 'active',
        lastChecked: Date.now()
      });
      startGuardMonitoring(cookies, profileId);
    } else if (action === 'deactivate') {
      // Stop protection
      activeSessions.delete(profileId);
    }

    res.status(200).json({ 
      status: 'success',
      message: `FB Guard ${action === 'activate' ? 'activated' : 'deactivated'}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

async function startGuardMonitoring(cookies, profileId) {
  // Implement your protection logic here
  // This could include checking for suspicious activity, etc.
  console.log(`Starting FB Guard protection for profile ${profileId}`);
  
  const interval = setInterval(async () => {
    if (!activeSessions.has(profileId)) {
      clearInterval(interval);
      return;
    }

    try {
      // Check for suspicious activity
      const isCompromised = await checkAccountSecurity(cookies);
      
      if (isCompromised) {
        // Take protective action
        await takeProtectiveAction(cookies);
      }

      // Update last checked time
      activeSessions.set(profileId, {
        ...activeSessions.get(profileId),
        lastChecked: Date.now()
      });
    } catch (err) {
      console.error(`Error monitoring profile ${profileId}:`, err);
    }
  }, 300000); // Check every 5 minutes
}

async function checkAccountSecurity(cookies) {
  // Implement actual security checks
  return false; // Placeholder
}

async function takeProtectiveAction(cookies) {
  // Implement protective actions like logging out other sessions
}

async function getProfileId(cookies) {
  try {
    const response = await axios.get('https://graph.facebook.com/me', {
      params: { access_token: await getAccessToken(cookies) },
      headers: { cookie: cookies }
    });
    return response.data.id;
  } catch (err) {
    throw new Error('Failed to get profile ID');
  }
}

async function getAccessToken(cookie) {
  try {
    const response = await axios.get('https://business.facebook.com/content_management', {
      headers: {
        'cookie': cookie,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const token = response.data.match(/"accessToken":\s*"([^"]+)"/);
    return token && token[1];
  } catch (err) {
    throw new Error('Failed to get access token');
  }
}

async function convertCookie(cookie) {
  try {
    const cookies = JSON.parse(cookie);
    const sbCookie = cookies.find(c => c.key === "sb");
    if (!sbCookie) throw new Error("Invalid appstate - missing sb cookie");
    
    return `sb=${sbCookie.value}; ${cookies.slice(1).map(c => `${c.key}=${c.value}`).join('; ')}`;
  } catch (err) {
    throw new Error("Invalid appstate format");
  }
}

app.listen(5000, () => {
  console.log('FB Guard server running on port 5000');
});
