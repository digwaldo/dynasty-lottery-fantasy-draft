// Vercel serverless function — proxies Sleeper API + avatar images
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { endpoint, avatar } = req.query;

  // ── AVATAR IMAGE PROXY ──────────────────────────────────────────────────────
  if (avatar) {
    try {
      const isUpload = avatar.startsWith('uploads/');
      const url = isUpload
        ? `https://sleepercdn.com/${avatar}`
        : `https://sleepercdn.com/avatars/thumbs/${avatar}`;
      const imgRes = await fetch(url);
      if (!imgRes.ok) return res.status(imgRes.status).end();
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).end();
    }
  }

  // ── PLAYER HEADSHOT PROXY ────────────────────────────────────────────────────
  const { player_img } = req.query;
  if (player_img) {
    try {
      const url = `https://sleepercdn.com/content/nfl/players/thumb/${player_img}.jpg`;
      const imgRes = await fetch(url);
      if (!imgRes.ok) return res.status(imgRes.status).end();
      const buffer = await imgRes.arrayBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate'); // 7 days
      return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      return res.status(500).end();
    }
  }

  // ── SLEEPER API PROXY ───────────────────────────────────────────────────────
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint or avatar param' });

  const allowed = [
    /^league\/\d+\/users$/,
    /^league\/\d+\/rosters$/,
    /^league\/\d+\/transactions\/\d+$/,
    /^league\/\d+\/traded_picks$/,
    /^league\/\d+\/drafts$/,
    /^draft\/\d+\/picks$/,
    /^players\/nfl$/,
  ];

  if (!allowed.some(r => r.test(endpoint))) {
    return res.status(403).json({ error: 'Endpoint not allowed' });
  }

  try {
    const url = `https://api.sleeper.app/v1/${endpoint}`;
    const sleeperRes = await fetch(url);
    if (!sleeperRes.ok) return res.status(sleeperRes.status).json({ error: 'Sleeper API error' });
    const data = await sleeperRes.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}