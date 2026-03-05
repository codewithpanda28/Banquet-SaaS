const url = 'https://n8n.srv1114630.hstgr.cloud/webhook/restaurant';
const payload = {
    action: 'waiter-order',
    bill_id: 'BILL-TEST-1234',
    table_number: '2',
    waiter_name: 'Akash',
    total: 1500,
    items: [{ name: 'Test Dish', quantity: 2, price: 750 }],
    restaurant_id: 'f1dde894-c027-4506-a55a-dfe65bb0449f'
};

async function test() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const d = await response.json();
        console.log('✅ N8N Response:', d);
    } catch (e) {
        console.error('❌ Error:', e);
    }
}

test();
