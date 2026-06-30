const http = require('http');

const data = JSON.stringify({
  clientId: "test_client_123" // we don't have a real one, but it should return 400 or something, not hang
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/meal-plans/generate-recipe-plan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
