import { describe, it, expect } from 'vitest';
import { appRequire, db } from './app.mjs';

const walkthroughRepository = appRequire('../repositories/walkthroughRepository');

/**
 * "Request Access" is the only way a visitor can ask for an account while
 * self-signup is closed. The form grew new fields and the insert started
 * writing their columns before any migration created them, so every request
 * failed with a 500. This stores one with every field filled, against the
 * migrated schema, so a column the insert names but the table lacks fails
 * here instead of in front of a customer.
 */
describe('access requests', () => {
  it('stores a request with every field the form sends', async () => {
    const email = `access_${process.pid}_${Date.now()}@example.com`;
    const row = await walkthroughRepository.insertWalkthroughRequest({
      name: 'Rohit Sharma',
      agencyName: 'Sharma Holidays',
      email,
      phone: '9876543210',
      city: 'Jaipur',
      state: 'Rajasthan',
      travelSpeciality: 'Honeymoon packages',
      instagramLink: 'instagram.com/sharmaholidays',
      websiteLink: 'https://sharmaholidays.example',
      gstNumber: '08AAAAA0000A1Z5',
      visitingCardUrl: 'https://cdn.example/card.jpg',
    });

    expect(row).toMatchObject({
      agency_name: 'Sharma Holidays',
      city: 'Jaipur',
      state: 'Rajasthan',
      travel_speciality: 'Honeymoon packages',
      instagram_link: 'instagram.com/sharmaholidays',
      website_link: 'https://sharmaholidays.example',
      // Instagram wins when both are given, as the form's single social field did.
      website_or_instagram: 'instagram.com/sharmaholidays',
      gst_number: '08AAAAA0000A1Z5',
      visiting_card_url: 'https://cdn.example/card.jpg',
    });
    await db.query('DELETE FROM walkthrough_requests WHERE email = $1', [email]);
  });

  it('stores a request with only the required fields', async () => {
    const email = `access_min_${process.pid}_${Date.now()}@example.com`;
    const row = await walkthroughRepository.insertWalkthroughRequest({
      name: 'Asha', agencyName: 'Asha Tours', email, phone: '9876500000',
    });
    expect(row.city).toBe('');
    expect(row.gst_number).toBe('');
    await db.query('DELETE FROM walkthrough_requests WHERE email = $1', [email]);
  });
});
