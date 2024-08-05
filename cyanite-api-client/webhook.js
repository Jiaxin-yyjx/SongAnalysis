import express from 'express';
import crypto from 'crypto';

const app = express();
const WEBHOOK_SECRET = 'c00076146703713b56222800a38222df207e1';

app.use(express.json());

function verifySignature(secret, signature, body) {
  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(body);
  const compareSignature = hmac.digest('hex');
  return signature === compareSignature;
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['signature'];
  const rawBody = JSON.stringify(req.body);

  if (!verifySignature(WEBHOOK_SECRET, signature, rawBody)) {
    return res.status(401).send('Invalid signature');
  }

  const { version, resource, event } = req.body;

  if (version === '2' && resource.type === 'LibraryTrack' && event.type === 'AudioAnalysisV6' && event.status === 'finished') {
    const trackId = resource.id;
    console.log(`Analysis finished for track ${trackId}. Fetching mood data...`);
    // Here you would call a function to fetch the mood data using the trackId
    fetchMoodData(trackId);
  }

  res.status(200).send('Webhook received');
});

app.listen(3000, () => console.log('Webhook server listening on port 3000'));