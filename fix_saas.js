const fs = require('fs');
const file = 'components/saas/SaaSLandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace takeaway/delivery mentions
content = content.replace(/Dine-In \/ Takeaway \/ Delivery Filter/g, 'Dine-In & Event Orders Filter');
content = content.replace(/Checkout: Dine-In \/ Takeaway \/ Delivery/g, 'Checkout: Direct to Table / Event Billing');
content = content.replace(/Dine-In · Takeaway · Delivery Modes/g, 'Dine-In · Event Pre-booking · Live Counters');
content = content.replace(/ready for pickup, delivery updates/g, 'ready for service, live event updates');

// Banquet specific words
content = content.replace(/Kitchen Display System \(KDS\)/g, 'Banquet KDS (Kitchen Display System)');
content = content.replace(/Restaurant/g, 'Banquet');
content = content.replace(/restaurant/g, 'banquet');
content = content.replace(/KFC/gi, 'Grand Taj');

// Write back
fs.writeFileSync(file, content);
console.log('Fixed takeaway/delivery references!');
