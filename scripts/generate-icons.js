const fs = require('fs');
const path = require('path');

// Create a simple calendar icon SVG
const createCalendarSVG = size => `
<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#3b82f6" stroke="#1e40af" stroke-width="2"/>
  <line x1="16" y1="2" x2="16" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="2" x2="8" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="3" y1="10" x2="21" y2="10" stroke="#1e40af" stroke-width="2"/>
  <rect x="7" y="14" width="2" height="2" fill="#ffffff"/>
  <rect x="11" y="14" width="2" height="2" fill="#ffffff"/>
  <rect x="15" y="14" width="2" height="2" fill="#ffffff"/>
  <rect x="7" y="18" width="2" height="2" fill="#ffffff"/>
  <rect x="11" y="18" width="2" height="2" fill="#ffffff"/>
</svg>
`;

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
  const svg = createCalendarSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Create shortcut icons
const shortcutNewEventSVG = `
<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#10b981" stroke="#059669" stroke-width="2"/>
  <line x1="16" y1="2" x2="16" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="2" x2="8" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="3" y1="10" x2="21" y2="10" stroke="#059669" stroke-width="2"/>
  <line x1="12" y1="13" x2="12" y2="19" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="9" y1="16" x2="15" y2="16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
</svg>
`;

const shortcutTodaySVG = `
<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
  <line x1="16" y1="2" x2="16" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="2" x2="8" y2="6" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <line x1="3" y1="10" x2="21" y2="10" stroke="#d97706" stroke-width="2"/>
  <circle cx="12" cy="16" r="3" fill="#ffffff"/>
</svg>
`;

fs.writeFileSync(
  path.join(iconsDir, 'shortcut-new-event.svg'),
  shortcutNewEventSVG
);
fs.writeFileSync(path.join(iconsDir, 'shortcut-today.svg'), shortcutTodaySVG);

console.log('Generated shortcut icons');
console.log('All PWA icons generated successfully!');
