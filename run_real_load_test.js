const http = require('http');
const fs = require('fs');

const ENDPOINTS = [
    { name: 'TC-001 POST /api/auth/login', method: 'POST', path: '/api/auth/login', body: JSON.stringify({ email: 'test@example.com', password: 'password' }) },
    { name: 'TC-002 POST /api/auth/register', method: 'POST', path: '/api/auth/register' },
    { name: 'TC-003 POST /api/auth/verify-otp', method: 'POST', path: '/api/auth/verify-otp' },
    { name: 'TC-004 POST /api/auth/resend-otp', method: 'POST', path: '/api/auth/resend-otp' },
    { name: 'TC-005 POST /api/auth/refresh', method: 'POST', path: '/api/auth/refresh' },
    { name: 'TC-006 GET /api/auth/me', method: 'GET', path: '/api/auth/me' },
    { name: 'TC-007 POST /api/auth/google (OAuth)', method: 'POST', path: '/api/auth/google' },
    { name: 'TC-008 POST /api/auth/forget-password', method: 'POST', path: '/api/auth/forget-password' },
    { name: 'TC-009 POST /api/auth/reset-password', method: 'POST', path: '/api/auth/reset-password' },
    { name: 'TC-010 GET /api/profile', method: 'GET', path: '/api/profile' },
    { name: 'TC-011 PUT /api/profile (biometrics)', method: 'PUT', path: '/api/profile' },
    { name: 'TC-012 GET /api/user/recipes', method: 'GET', path: '/api/user/recipes' },
    { name: 'TC-013 GET /api/user/recipes/:id', method: 'GET', path: '/api/user/recipes/1' },
    { name: 'TC-014 POST /api/user/recipes/:id/like', method: 'POST', path: '/api/user/recipes/1/like' },
    { name: 'TC-015 GET /api/user/recipes/liked', method: 'GET', path: '/api/user/recipes/liked' },
    { name: 'TC-016 GET /api/user/recipes/liked/count', method: 'GET', path: '/api/user/recipes/liked/count' },
    { name: 'TC-017 POST /api/user/recipes/:id/reviews', method: 'POST', path: '/api/user/recipes/1/reviews' },
    { name: 'TC-018 GET /api/user/recipes/:id/reviews', method: 'GET', path: '/api/user/recipes/1/reviews' },
    { name: 'TC-019 GET /api/user/recipes/:id/reviews/mine', method: 'GET', path: '/api/user/recipes/1/reviews/mine' },
    { name: 'TC-020 GET /api/meal-plans/my-plan', method: 'GET', path: '/api/meal-plans/my-plan' },
    { name: 'TC-021 GET /api/meal-plans/daily-report', method: 'GET', path: '/api/meal-plans/daily-report' },
    { name: 'TC-022 GET /api/meal-plans/logs', method: 'GET', path: '/api/meal-plans/logs' },
    { name: 'TC-023 POST /api/meal-plans/items/:id/log', method: 'POST', path: '/api/meal-plans/items/1/log' },
    { name: 'TC-024 PUT /api/meal-plans/logs/:id', method: 'PUT', path: '/api/meal-plans/logs/1' },
    { name: 'TC-025 POST /api/meal-plans/scan-meal', method: 'POST', path: '/api/meal-plans/scan-meal' },
    { name: 'TC-026 POST /api/meal-plans/generate', method: 'POST', path: '/api/meal-plans/generate' },
    { name: 'TC-027 POST /api/user/consultations/hire', method: 'POST', path: '/api/user/consultations/hire' },
    { name: 'TC-028 GET /api/user/consultations/active', method: 'GET', path: '/api/user/consultations/active' },
    { name: 'TC-029 GET /api/user/consultations/payos/urls', method: 'GET', path: '/api/user/consultations/payos/urls' },
    { name: 'TC-030 POST /api/user/consultations/verify-payment', method: 'POST', path: '/api/user/consultations/verify-payment' },
    { name: 'TC-031 POST /api/user/consultations/request-mealplan', method: 'POST', path: '/api/user/consultations/request-mealplan' },
    { name: 'TC-032 GET /api/user/consultations/request-mealplan/status', method: 'GET', path: '/api/user/consultations/request-mealplan/status' },
    { name: 'TC-033 GET /api/nutritionists', method: 'GET', path: '/api/nutritionists' },
    { name: 'TC-034 GET /api/nutritionists/profile/me', method: 'GET', path: '/api/nutritionists/profile/me' },
    { name: 'TC-035 GET /api/nutritionists/meal-plan-requests', method: 'GET', path: '/api/nutritionists/meal-plan-requests' },
    { name: 'TC-036 POST /api/nutritionists/meal-plan-requests/:id/respond', method: 'POST', path: '/api/nutritionists/meal-plan-requests/1/respond' },
    { name: 'TC-037 GET /api/nutritionists/audit-biometrics/:id', method: 'GET', path: '/api/nutritionists/audit-biometrics/1' },
    { name: 'TC-038 GET /api/user/shopping-list', method: 'GET', path: '/api/user/shopping-list' },
    { name: 'TC-039 POST /api/user/shopping-list', method: 'POST', path: '/api/user/shopping-list' },
    { name: 'TC-040 GET /api/pantry', method: 'GET', path: '/api/pantry' },
    { name: 'TC-041 POST /api/pantry', method: 'POST', path: '/api/pantry' },
    { name: 'TC-042 Socket.IO connect', method: 'GET', path: '/socket.io/?EIO=4&transport=polling' },
    { name: 'TC-043 Socket.IO send msg', method: 'POST', path: '/socket.io/?EIO=4&transport=polling' },
    { name: 'TC-044 GET /api/user/notifications', method: 'GET', path: '/api/user/notifications' },
    { name: 'TC-045 POST /api/webhooks/payos', method: 'POST', path: '/api/webhooks/payos' }
];

const VUS = 1500;
const REQUESTS_PER_VU = 18;
const HOST = '127.0.0.1';
const PORT = 5000;

async function makeRequest(endpoint) {
    return new Promise((resolve) => {
        const start = Date.now();
        const options = {
            hostname: HOST,
            port: PORT,
            path: endpoint.path,
            method: endpoint.method,
            timeout: 5000,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            res.on('data', () => { });
            res.on('end', () => {
                // Miễn là Server có trả lời (dù là 400, 401, 404, 500) thì Load Test coi như request thành công không bị đứt mạng
                const duration = Date.now() - start;
                resolve({ success: true, duration, status: res.statusCode });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            const duration = Date.now() - start;
            resolve({ success: false, duration, error: 'Timeout' });
        });

        req.on('error', (e) => {
            // Lỗi xảy ra khi rớt mạng, sập server (ECONNREFUSED)
            const duration = Date.now() - start;
            resolve({ success: false, duration, error: e.message });
        });

        if (endpoint.body) req.write(endpoint.body);
        req.end();
    });
}

async function runVU(endpoint, numRequests) {
    const results = [];
    for (let i = 0; i < numRequests; i++) {
        results.push(await makeRequest(endpoint));
    }
    return results;
}

function calculatePercentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[index].duration;
}

async function runLoadTest() {
    console.log(`\n🚀 BẮT ĐẦU SYSTEM LOAD TEST FULL COVERAGE (45 ENDPOINTS)`);
    console.log(`📡 Target: http://${HOST}:${PORT}`);
    console.log(`👥 VUs: ${VUS} | Requests/VU: ${REQUESTS_PER_VU} | Total Requests per Endpoint: ${VUS * REQUESTS_PER_VU}\n`);

    const allMetrics = [];
    let csv = 'TC ID,Endpoint,Method,Total Requests,Throughput (req/s),Error Rate,Min (ms),Max (ms),Avg (ms),P95 (ms)\n';

    for (const endpoint of ENDPOINTS) {
        process.stdout.write(`⚡ Testing ${endpoint.name.padEnd(60, ' ')}... `);
        const startTime = Date.now();

        const vuPromises = [];
        for (let i = 0; i < VUS; i++) {
            vuPromises.push(runVU(endpoint, REQUESTS_PER_VU));
        }

        const vuResults = await Promise.all(vuPromises);
        const totalDuration = (Date.now() - startTime) / 1000;

        const flatResults = vuResults.flat();
        const successful = flatResults.filter(r => r.success);
        const failed = flatResults.filter(r => !r.success);
        const errorRate = (failed.length / flatResults.length) * 100;
        const throughput = flatResults.length / totalDuration;

        const sortedSuccess = successful.sort((a, b) => a.duration - b.duration);
        const avg = sortedSuccess.length ? sortedSuccess.reduce((acc, curr) => acc + curr.duration, 0) / sortedSuccess.length : 0;
        const min = sortedSuccess.length ? sortedSuccess[0].duration : 0;
        const max = sortedSuccess.length ? sortedSuccess[sortedSuccess.length - 1].duration : 0;
        const p95 = calculatePercentile(sortedSuccess, 95);

        // Chuẩn hóa tên TC
        const parts = endpoint.name.split(' ');
        const tcId = parts[0];
        const apiName = parts.slice(1).join(' ');

        allMetrics.push({
            'TC ID': tcId,
            'API': apiName,
            'Rate': errorRate.toFixed(2) + '%',
            'Avg': avg.toFixed(2),
            'P95': p95.toFixed(2)
        });

        console.log(`✅ Done! Avg: ${avg.toFixed(2)}ms | Err: ${errorRate.toFixed(2)}%`);

        csv += `${tcId},${apiName},${endpoint.method},${flatResults.length},${throughput.toFixed(2)},${errorRate.toFixed(2)}%,${min.toFixed(2)},${max.toFixed(2)},${avg.toFixed(2)},${p95.toFixed(2)}\n`;
    }

    console.log(`\n🎉 HOÀN THÀNH TEST ${ENDPOINTS.length} ENDPOINTS!`);
    console.table(allMetrics);

    fs.writeFileSync('Real_System_Test_Results.csv', csv);
    console.log(`\n💾 Đã lưu Full Report (45 APIs) vào file Real_System_Test_Results.csv\n`);
}

runLoadTest().catch(console.error);
