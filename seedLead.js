const { query } = require('./AdminBE/db');

async function seedLead() {
  const sampleCard = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300"><rect width="500" height="300" rx="16" fill="%230f172a"/><rect x="20" y="20" width="460" height="260" rx="10" fill="none" stroke="%23f59e0b" stroke-width="2" stroke-dasharray="6 4"/><text x="50" y="70" font-family="Arial" font-size="22" font-weight="bold" fill="%23ffffff">SHARMA HOLIDAYS &amp; TOURS</text><text x="50" y="100" font-family="Arial" font-size="14" fill="%23f59e0b">Approved DMC &amp; Group Tour Specialist</text><line x1="50" y1="120" x2="450" y2="120" stroke="%23334155" stroke-width="1.5"/><text x="50" y="150" font-family="Arial" font-size="13" fill="%2394a3b8">Founder: Rohit Sharma</text><text x="50" y="180" font-family="Arial" font-size="13" fill="%2394a3b8">Office: 204 Crystal Tower, MI Road, Jaipur - 302001</text><text x="50" y="210" font-family="Arial" font-size="13" fill="%2394a3b8">Contact: +91 98290 12345 | info@sharmaholidays.com</text><text x="50" y="240" font-family="Arial" font-size="13" fill="%2338bdf8">Instagram: @sharma_holidays_official</text><text x="50" y="265" font-family="Arial" font-size="12" fill="%2310b981">GSTIN: 08AABCS1429B1Z8</text></svg>`;

  await query(`
    INSERT INTO walkthrough_requests (
      name, agency_name, email, phone, city, state, travel_speciality,
      website_or_instagram, gst_number, visiting_card_url, status
    )
    VALUES (
      'Rohit Sharma',
      'Sharma Holidays',
      'rohit@sharmaholidays.com',
      '9829012345',
      'Jaipur',
      'Rajasthan',
      'Domestic Group Tours (Himachal, Uttarakhand, Kashmir)',
      'https://instagram.com/sharma_holidays_official',
      '08AABCS1429B1Z8',
      $1,
      'pending'
    )
  `, [sampleCard]);

  console.log('✅ Successfully inserted Sharma Holidays with card & Instagram link!');
  process.exit(0);
}

seedLead().catch((e) => {
  console.error(e);
  process.exit(1);
});
