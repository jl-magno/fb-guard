const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store active sessions
const activeSessions = new Map();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/guard', async (req, res) => {
  try {
    const { cookie, action } = req.body;
    
    if (!cookie || !action) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Missing appstate or action' 
      });
    }

    const cookies = await convertCookie(cookie);
    const profileId = await getProfileId(cookies);
    
    if (action === 'activate') {
      activeSessions.set(profileId, { status: 'active' });
      return res.json({ 
        status: 'success', 
        message: 'FB Guard activated successfully' 
      });
    } else if (action === 'deactivate') {
      activeSessions.delete(profileId);
      return res.json({ 
        status: 'success', 
        message: 'FB Guard deactivated' 
      });
    }
  } catch (error) {
    console.error('Guard Error:', error);
    return res.status(500).json({ 
      status: 'error',
      message: error.message || 'Internal server error' 
    });
  }
});

// Helper functions
async function getProfileId(cookies) {
  try {
    const appstate = JSON.parse(cookies);
    const cUser = appstate.find(c => c.key === "c_user");
    return cUser?.value || 'unknown';
  } catch (error) {
    console.error('Profile ID Error:', error);
    throw new Error('Failed to get profile ID');
  }
}

async function convertCookie(cookie) {
  try {
    const parsed = JSON.parse(cookie);
    if (!Array.isArray(parsed)) throw new Error('Invalid appstate format');
    return cookie;
  } catch (error) {
    throw new Error('Invalid appstate. Please provide valid Facebook cookies in JSON format');
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
