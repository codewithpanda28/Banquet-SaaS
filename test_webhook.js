
async function testWebhook() {
    try {
        const response = await fetch('http://localhost:3000/api/webhook/automation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'new-order',
                payload: { bill_id: 'TEST123', total: 100 }
            })
        });
        const data = await response.json();
        console.log('Response:', data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testWebhook();
