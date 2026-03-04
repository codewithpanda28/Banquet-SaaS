
async function runTest() {
    const url = 'https://n8n.srv1114630.hstgr.cloud/webhook-test/restaurant';
    console.log('Testing direct n8n link:', url);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'manual-test', message: 'Hello from script' })
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response Body:', text);

        if (res.status === 404) {
            console.log('\n--- DIAGNOSIS ---');
            console.log('The error 404 means n8n is NOT LISTENING.');
            console.log('Go to n8n, click your Webhook node, and press "Listen for Test Event".');
        }
    } catch (e) {
        console.error('Network Error:', e.message);
    }
}

runTest();
