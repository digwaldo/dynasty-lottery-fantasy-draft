// Vercel serverless function — proxies Sleeper API to avoid CORS
export default async function handler(req, res) {
  // Allow all origins (your own frontend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint param' });
  }

  // Whitelist only sleeper API paths for security
  const allowed = [
    /^league\/\d+\/users$/,
    /^league\/\d+\/rosters$/,
    /^league\/\d+\/transactions\/\d+$/,
    /^league\/\d+\/traded_picks$/,
    /^league\/\d+\/drafts$/,
    /^draft\/\d+\/picks$/,
    /^players\/nfl$/,
  ];

  const isAllowed = allowed.some(r => r.test(endpoint));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' });
  }

  try {
    const url = `https://api.sleeper.app/v1/${endpoint}`;
    const sleeperRes = await fetch(url);
    if (!sleeperRes.ok) {
      return res.status(sleeperRes.status).json({ error: 'Sleeper API error' });
    }
    const data = await sleeperRes.json();
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}