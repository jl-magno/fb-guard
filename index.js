async function getProfileId(cookies) {
  try {
    // First try to get the profile ID directly from c_user cookie
    const appstate = JSON.parse(cookies);
    const cUser = appstate.find(c => c.key === "c_user");
    if (cUser && cUser.value) {
      return cUser.value; // Return the user ID directly from cookie
    }

    // If not found in cookies, try via Graph API
    const accessToken = await getAccessToken(cookies);
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    const response = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: accessToken,
        fields: 'id'
      }
    });

    if (response.data && response.data.id) {
      return response.data.id;
    }
    throw new Error('No profile ID in response');
  } catch (err) {
    console.error('Profile ID Error:', err.message);
    throw new Error('Failed to get profile ID. Please check your appstate is valid and not expired.');
  }
}

async function getAccessToken(cookie) {
  try {
    // Try to extract from fr cookie (common in mobile tokens)
    const appstate = JSON.parse(cookie);
    const frCookie = appstate.find(c => c.key === "fr");
    if (frCookie && frCookie.value) {
      const frParts = frCookie.value.split('.');
      if (frParts.length > 2) {
        return `${frParts[2]}|${frParts.slice(3).join('.')}`;
      }
    }

    // Alternative method using xs and c_user
    const xsCookie = appstate.find(c => c.key === "xs");
    const cUser = appstate.find(c => c.key === "c_user");
    
    if (xsCookie && cUser) {
      return `${cUser.value}|${xsCookie.value.split('|')[0]}`;
    }

    // Fallback to business.facebook.com method
    const headers = {
      'cookie': convertCookieToString(appstate),
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    const response = await axios.get('https://business.facebook.com/content_management', { headers });
    const tokenMatch = response.data.match(/"accessToken":\s*"([^"]+)"/);
    return tokenMatch && tokenMatch[1];
  } catch (err) {
    console.error('Access Token Error:', err.message);
    return null;
  }
}

function convertCookieToString(cookies) {
  return cookies.map(c => `${c.key}=${c.value}`).join('; ');
}

async function convertCookie(cookie) {
  try {
    const cookies = JSON.parse(cookie);
    if (!Array.isArray(cookies)) {
      throw new Error("Invalid appstate format - expected array");
    }
    
    // Verify essential cookies are present
    const requiredCookies = ['c_user', 'xs', 'fr'];
    const hasRequired = requiredCookies.some(req => cookies.some(c => c.key === req));
    
    if (!hasRequired) {
      throw new Error("Appstate missing essential cookies (c_user, xs, or fr)");
    }
    
    return cookies; // Return parsed cookies directly
  } catch (err) {
    console.error('Cookie Conversion Error:', err.message);
    throw new Error("Invalid appstate. Please provide a valid Facebook appstate in JSON format.");
  }
}
