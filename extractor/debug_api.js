// Debug script to find the correct API endpoint
const endpoints = [
  '/wefeed-h5api-bff/subject/episodes?detailPath=the-chi-0OZDg6KP353',
  '/wefeed-h5api-bff/episodes?detailPath=the-chi-0OZDg6KP353',
  '/wefeed-h5api-bff/subject/episode?detailPath=the-chi-0OZDg6KP353',
  '/wefeed-h5api-bff/seasons?detailPath=the-chi-0OZDg6KP353',
  '/wefeed-h5api-bff/subject/list?detailPath=the-chi-0OZDg6KP353',
];

const headers = {
  'content-type': 'application/json',
  'accept': 'application/json',
  'x-request-lang': 'en',
  'x-client-info': JSON.stringify({ timezone: 'UTC' })
};

for (const path of endpoints) {
  try {
    const response = await fetch(`https://h5-api.aoneroom.com${path}`, { headers });
    const text = await response.text();
    console.log('\n=== Endpoint:', path, '===');
    console.log('Status:', response.status);
    if (text.startsWith('{')) {
      const data = JSON.parse(text);
      console.log('Code:', data.code, 'Message:', data.message);
      console.log('Data keys:', Object.keys(data.data || {}).join(', ') || 'none');
    } else {
      console.log('Response (first 200 chars):', text.substring(0, 200));
    }
  } catch (e) {
    console.log('\n=== Endpoint:', path, '===');
    console.log('Error:', e.message.substring(0, 100));
  }
}
