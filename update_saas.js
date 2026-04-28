const fs = require('fs');
const file = 'components/saas/SaaSLandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Global replacements
content = content.replace(/RestroSaaS/g, 'BanquetSaaS');
content = content.replace(/Restro<span/g, 'Banquet<span');
content = content.replace(/Restaurants/g, 'Banquets');
content = content.replace(/Restaurant/g, 'Banquet');
content = content.replace(/restaurants/g, 'banquets');
content = content.replace(/restaurant/g, 'banquet');
content = content.replace(/Restaurateurs/g, 'Banquet Owners');
content = content.replace(/restaurateurs/g, 'banquet owners');

// Specific text adjustments for Banquet
content = content.replace(/Butter Chicken/g, 'Wedding Feast');
content = content.replace(/Garlic Naan x2/g, 'Premium Buffet');
content = content.replace(/Mango Lassi/g, 'Welcome Drinks');

// Fix commented out sections for Pricing and Testimonials
content = content.replace(/\{\/\*\s*<section id="pricing"/g, '<section id="pricing"');
content = content.replace(/\{\/\*\s*<section id="testimonials"/g, '<section id="testimonials"');
content = content.replace(/<\/section>\s*\*\/\}/g, '</section>');

fs.writeFileSync(file, content);
console.log('Replaced successfully');
