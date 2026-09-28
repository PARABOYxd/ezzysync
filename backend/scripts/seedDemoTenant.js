/**
 * Fills one tenant with realistic demo data so the app can be tried end to end
 * as a working travel agency: team, hotels, leads at every stage, WhatsApp
 * conversations, quotations, bookings with payments and vouchers, a group
 * batch, expenses and follow-ups.
 *
 *   node scripts/seedDemoTenant.js <tenant-admin-email>
 *
 * Local only: refuses to run unless DATABASE_URL points at localhost, and
 * refuses a tenant that already has leads, so it never doubles up or touches
 * a real agency's data.
 *
 * Nothing is sent. Records go through the same services and repositories the
 * API uses (so ids, totals and customer links come out right), except booking
 * creation, which skips the WhatsApp/email confirmation createBooking fires.
 * Customer emails are @example.com. Phone numbers are made up - do not send
 * messages to them from the UI.
 */
require('../config/env');
const { pool, query } = require('../config/db');
const userService = require('../services/userService');
const leadService = require('../services/leadService');
const quotationService = require('../services/quotationService');
const bookingService = require('../services/bookingService');
const batchService = require('../services/batchService');
const customerService = require('../services/customerService');
const leadRepository = require('../repositories/leadRepository');
const bookingRepository = require('../repositories/bookingRepository');
const hotelRepository = require('../repositories/hotelRepository');
const expenseRepository = require('../repositories/expenseRepository');
const whatsappRepository = require('../repositories/whatsappRepository');

const DAY = 24 * 60 * 60 * 1000;

/** A moment `days` from today (negative = past) at a given local time. */
function at(days, hour = 11, minute = 0) {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}
const isoDate = (days) => at(days).toISOString().slice(0, 10);
const unix = (date) => Math.floor(date.getTime() / 1000);

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL || '';
  const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing to seed: DATABASE_URL host is "${host || 'unset'}". This script is for a local database only.`);
  }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TEAM = [
  { name: 'Sneha Iyer', email: 'sneha.demo@example.com' },
  { name: 'Arjun Mehta', email: 'arjun.demo@example.com' },
];
const TEAM_PASSWORD = 'Team@Rishab2026';

const HOTELS = [
  { key: 'alleppey', name: 'Lake Palace Houseboats', city: 'Alleppey', rating: '4', address: 'Finishing Point, Punnamada, Alappuzha, Kerala', contactPerson: 'Joseph Varghese', contactPhone: '9447000101',
    roomsAndRates: [{ roomType: 'Deluxe Houseboat (1 BR)', costPrice: '8500', sellingPrice: '11000' }, { roomType: 'Premium Houseboat (2 BR)', costPrice: '14000', sellingPrice: '18000' }] },
  { key: 'munnar', name: 'Tea Valley Resort', city: 'Munnar', rating: '4', address: 'Chithirapuram, Munnar, Kerala', contactPerson: 'Anil Kumar', contactPhone: '9447000102',
    roomsAndRates: [{ roomType: 'Valley View Room', costPrice: '4200', sellingPrice: '5800' }, { roomType: 'Family Cottage', costPrice: '6500', sellingPrice: '8500' }] },
  { key: 'manali', name: 'Snow Peak Retreat', city: 'Manali', rating: '4', address: 'Log Huts Area, Manali, Himachal Pradesh', contactPerson: 'Rakesh Thakur', contactPhone: '9418000103',
    roomsAndRates: [{ roomType: 'Deluxe Room', costPrice: '3200', sellingPrice: '4500' }, { roomType: 'Mountain View Suite', costPrice: '5500', sellingPrice: '7200' }] },
  { key: 'goa', name: 'Calangute Grand Beach Resort', city: 'Goa', rating: '4', address: 'Calangute-Baga Road, North Goa', contactPerson: 'Savio Fernandes', contactPhone: '9822000104',
    roomsAndRates: [{ roomType: 'Superior Room', costPrice: '3800', sellingPrice: '5200' }, { roomType: 'Pool View Room', costPrice: '4800', sellingPrice: '6400' }] },
  { key: 'jaipur', name: 'Haveli Heritage Stay', city: 'Jaipur', rating: '3', address: 'Near Hawa Mahal, Jaipur, Rajasthan', contactPerson: 'Mahendra Singh', contactPhone: '9829000105',
    roomsAndRates: [{ roomType: 'Heritage Room', costPrice: '3000', sellingPrice: '4200' }] },
];

// One entry per enquiry. `chat` is the WhatsApp conversation as [dayOffset, "HH:MM", direction, text].
const CUSTOMERS = [
  {
    key: 'rahul', name: 'Rahul Sharma', phone: '9820144821', interest: 'Goa 4N/5D Family Trip', source: 'WhatsApp',
    stage: 'New', priority: 'Hot', travelers: 3, departureInDays: 40, assignedTo: '', createdDaysAgo: 0,
    notes: '2 adults + 1 child (7 yrs). Wants North Goa resort with pool, airport pickup.',
    chat: [
      [0, '10:12', 'inbound', 'Hi, I saw your Goa package on Instagram. Want family package for North Goa resort with airport cab and breakfast.'],
      [0, '10:13', 'inbound', 'We are 2 adults and 1 kid, 7 years. Planning first week of November.'],
    ],
    unread: 2,
  },
  {
    key: 'priya', name: 'Priya Patel', phone: '9898201145', interest: 'Kashmir 5N/6D Honeymoon', source: 'Landing Page',
    stage: 'Contacted', priority: 'Warm', travelers: 2, departureInDays: 55, assignedTo: 'Sneha Iyer', createdDaysAgo: 3,
    notes: 'Honeymoon, wants houseboat night in Srinagar + Gulmarg gondola.',
    followUps: [
      { daysAgo: 3, type: 'call', note: 'Called Priya. Wedding on 18 Nov, travel after 22 Nov. Budget around ₹1L.', done: true },
      { daysAgo: 1, type: 'whatsapp', note: 'Shared 2 Kashmir options (3★ and 4★) on WhatsApp.', done: true },
      { dueInDays: 0, hour: 17, type: 'call', note: 'Call Priya to confirm hotel category and dates.' },
    ],
    chat: [
      [-3, '16:40', 'inbound', 'Hello, filled the form on your website for Kashmir honeymoon package.'],
      [-3, '16:52', 'outbound', 'Hi Priya! Congratulations 🎉 This is Sneha from Rishab Travels. When are you planning to travel and how many nights?'],
      [-3, '17:05', 'inbound', 'After 22 Nov, 5 nights. Want one night in houseboat for sure.'],
      [-1, '12:20', 'outbound', 'Sharing 2 options for your Kashmir honeymoon: 3★ package ₹82,000 and 4★ package ₹98,000 for 2 people, including houseboat night, Gulmarg gondola and private cab. Let me know which one you like 😊'],
      [-1, '21:15', 'inbound', 'Thanks! Discussing with my husband, will tell you tomorrow.'],
    ],
  },
  {
    key: 'amit', name: 'Amit Verma', phone: '9811023347', interest: 'Dubai 4N/5D Family Package', source: 'WhatsApp',
    stage: 'Negotiating', priority: 'Hot', travelers: 4, departureInDays: 30, assignedTo: 'Sneha Iyer', createdDaysAgo: 6,
    notes: 'Family of 4 (2 kids). Wants Desert Safari + Burj Khalifa 124th floor. Asked for a better price.',
    followUps: [
      { daysAgo: 5, type: 'call', note: 'Discussed Dubai itinerary. Needs visa for 4, flights from Delhi.', done: true },
      { daysAgo: 2, type: 'whatsapp', note: 'Sent quotation for ₹1,20,000. Client asked for discount.', done: true },
      { dueInDays: -1, hour: 12, type: 'call', note: 'Call back Amit with revised price (hotel downgrade option).' },
    ],
    chat: [
      [-6, '11:02', 'inbound', 'Hi, need Dubai package for family of 4 in last week of October. Kids are 8 and 12.'],
      [-6, '11:10', 'outbound', 'Hi Amit ji, thanks for reaching out! We have a 4N/5D Dubai family package with Desert Safari, Dhow Cruise and Burj Khalifa. Flying from Delhi?'],
      [-6, '11:14', 'inbound', 'Yes from Delhi. Please include visa also.'],
      [-2, '15:30', 'outbound', 'Here is your day-wise Dubai quotation 👇 Total ₹1,20,000 for 4 people including visa, 4★ hotel, transfers and sightseeing. Flights extra.'],
      [-2, '18:45', 'inbound', 'Price is little high. My friend got similar for 1.05 lakh. Can you do something?'],
      [-2, '18:50', 'outbound', 'Let me check with the hotel and get back to you with the best possible price 🙏'],
    ],
  },
  {
    key: 'neha', name: 'Neha Kapoor', phone: '9930456712', interest: 'Bali 5N/6D Honeymoon', source: 'Referral',
    stage: 'Contacted', priority: 'Warm', travelers: 2, departureInDays: 75, assignedTo: 'Sneha Iyer', createdDaysAgo: 4,
    notes: 'Referred by Vikram Singh. December travel, budget ₹1.2L.',
    followUps: [
      { daysAgo: 4, type: 'call', note: 'Intro call. Wants private pool villa in Ubud for 2 nights.', done: true },
      { dueInDays: 2, hour: 11, type: 'whatsapp', note: 'Send Bali quotation with pool villa option.' },
    ],
    chat: [
      [-4, '13:25', 'inbound', 'Hi, Vikram gave me your number. Looking for a Bali 5N/6D honeymoon package in December. Budget around ₹1.2L.'],
      [-4, '13:40', 'outbound', 'Hi Neha! Thanks for reaching out, and congratulations 🎉 Would you prefer Ubud + Seminyak split stay? We can add a private pool villa.'],
      [-4, '13:58', 'inbound', 'Yes pool villa for 2 nights would be perfect.'],
    ],
  },
  {
    key: 'pooja', name: 'Pooja Malhotra', phone: '9876012233', interest: 'Kerala 4N/5D Backwaters', source: 'WhatsApp',
    stage: 'Won', priority: 'Warm', travelers: 2, departureInDays: 20, assignedTo: 'Sneha Iyer', createdDaysAgo: 12,
    notes: 'Munnar 2N + Alleppey houseboat 1N + Kochi 1N.',
    chat: [
      [-12, '10:05', 'inbound', 'Hi, want Kerala trip for 2 in mid October. Munnar and houseboat.'],
      [-11, '12:30', 'outbound', 'Hi Pooja! Here is your Kerala 4N/5D plan: Munnar 2N, Alleppey houseboat 1N, Kochi 1N. Total ₹54,000 for 2 with breakfast and private cab.'],
      [-10, '19:10', 'inbound', 'Looks good. How much advance to book?'],
      [-10, '19:18', 'outbound', 'Just ₹25,000 advance to confirm, balance 7 days before travel. You can pay via UPI or bank transfer.'],
      [-9, '11:02', 'inbound', 'Paid ₹25,000 on UPI. Please confirm.'],
      [-9, '11:20', 'outbound', 'Received with thanks ✅ Your Kerala trip is confirmed! Balance ₹29,000 is due a week before travel.'],
    ],
    booking: {
      pricePerPerson: 27000, trip: 'Kerala 4N/5D Backwaters', travelStatus: 'Booked', hotel: 'munnar', roomCategory: 'Valley View Room', mealPlan: 'CP',
      hotelBookingStatus: 'Confirmed', hotelConfirmationNo: 'TVR-88214', checkInDays: 20, checkOutDays: 22,
      vehicleType: 'Toyota Innova', driverName: 'Biju Thomas', driverPhone: '9447000210', vehicleNumber: 'KL-07-CD-4521', pickupTime: '10:30 AM',
      pickupLocation: 'Kochi International Airport', dropLocation: 'Kochi International Airport',
      vendorHotelCost: 21400, vendorTransportCost: 12000,
      payments: [{ daysAgo: 9, amount: 25000, method: 'UPI', reference: 'UPI-4521889012' }],
    },
  },
  {
    key: 'vikram', name: 'Vikram Singh', phone: '9811987654', interest: 'Manali 5N/6D Family Trip', source: 'Manual',
    stage: 'Won', priority: 'Cold', travelers: 3, departureInDays: 6, assignedTo: 'Arjun Mehta', createdDaysAgo: 21,
    notes: 'Repeat customer. Volvo from Delhi both ways.',
    chat: [
      [-2, '09:40', 'outbound', 'Hi Vikram ji! Your Manali trip starts this weekend 🏔️ Driver Rakesh will pick you up at Manali bus stand at 8:00 AM. Hotel voucher attached.'],
      [-2, '09:55', 'inbound', 'Thank you! All set. Kids are very excited 😄'],
    ],
    booking: {
      pricePerPerson: 24000, trip: 'Manali 5N/6D Family Trip', travelStatus: 'Booked', hotel: 'manali', roomCategory: 'Mountain View Suite', mealPlan: 'MAP',
      hotelBookingStatus: 'Confirmed', hotelConfirmationNo: 'SPR-30117', checkInDays: 6, checkOutDays: 11,
      vehicleType: 'Toyota Innova Crysta', driverName: 'Rakesh Negi', driverPhone: '9418000220', vehicleNumber: 'HP-58-B-2233', pickupTime: '08:00 AM',
      pickupLocation: 'Manali Bus Stand', dropLocation: 'Manali Bus Stand',
      vendorHotelCost: 38000, vendorTransportCost: 14000,
      payments: [
        { daysAgo: 18, amount: 30000, method: 'Bank Transfer', reference: 'NEFT-HDFC-778120' },
        { daysAgo: 7, amount: 42000, method: 'UPI', reference: 'UPI-6612098745' },
      ],
    },
  },
  {
    key: 'ananya', name: 'Ananya Reddy', phone: '9849011278', interest: 'Rajasthan 6N/7D Heritage Tour', source: 'Website',
    stage: 'Won', priority: 'Cold', travelers: 2, departureInDays: -25, assignedTo: 'Arjun Mehta', createdDaysAgo: 60,
    notes: 'Jaipur - Jodhpur - Udaipur. Trip completed, left a 5★ Google review.',
    chat: [
      [-17, '20:10', 'inbound', 'Back home safely! Thank you for the wonderful Rajasthan trip. Udaipur was the best 😍'],
      [-17, '20:30', 'outbound', 'So happy to hear that, Ananya! Would love a quick Google review if you have a minute 🙏'],
      [-16, '10:15', 'inbound', 'Done ⭐⭐⭐⭐⭐'],
    ],
    booking: {
      pricePerPerson: 38000, trip: 'Rajasthan 6N/7D Heritage Tour', travelStatus: 'Completed', hotel: 'jaipur', roomCategory: 'Heritage Room', mealPlan: 'CP',
      hotelBookingStatus: 'Confirmed', hotelConfirmationNo: 'HHS-11902', checkInDays: -25, checkOutDays: -23,
      vehicleType: 'Maruti Dzire', driverName: 'Mahaveer', driverPhone: '9829000230', vehicleNumber: 'RJ-14-TA-9087', pickupTime: '11:00 AM',
      pickupLocation: 'Jaipur Airport', dropLocation: 'Udaipur Airport',
      vendorHotelCost: 36000, vendorTransportCost: 21000,
      payments: [
        { daysAgo: 55, amount: 30000, method: 'UPI', reference: 'UPI-3390127765' },
        { daysAgo: 33, amount: 46000, method: 'Bank Transfer', reference: 'IMPS-ICICI-550981' },
      ],
    },
  },
  {
    key: 'sanjay', name: 'Sanjay Gupta', phone: '9412055678', interest: 'Char Dham Yatra 9N/10D (Group of 8)', source: 'Referral',
    stage: 'Won', priority: 'Warm', travelers: 8, departureInDays: 35, assignedTo: 'Arjun Mehta', createdDaysAgo: 15,
    notes: 'Joint family group of 8, includes 2 senior citizens. Tempo Traveller required.',
    chat: [
      [-15, '08:30', 'inbound', 'Namaste, we are 8 people for Char Dham yatra in November. Two senior citizens. Please share package.'],
      [-14, '12:00', 'outbound', 'Namaste Sanjay ji 🙏 Sharing Char Dham 9N/10D group package from Haridwar with Tempo Traveller, hotels and helicopter option for Kedarnath. ₹28,000 per person.'],
      [-8, '17:45', 'inbound', 'We will go with this. Sending advance ₹50,000 now.'],
      [-8, '18:05', 'outbound', 'Received ₹50,000, thank you! We are confirming hotels now. Will share details by next week.'],
    ],
    booking: {
      pricePerPerson: 28000, trip: 'Char Dham Yatra 9N/10D (Group of 8)', travelStatus: 'Confirming', mealPlan: 'MAP',
      vehicleType: 'Tempo Traveller (12 seater)', pickupLocation: 'Haridwar Railway Station', dropLocation: 'Haridwar Railway Station', pickupTime: '07:00 AM',
      vendorHotelCost: 96000, vendorTransportCost: 52000, vendorOtherCost: 8000,
      payments: [{ daysAgo: 8, amount: 50000, method: 'Bank Transfer', reference: 'NEFT-SBI-221907' }],
      batch: true,
    },
  },
  {
    key: 'karan', name: 'Karan Mehra', phone: '9899112030', interest: 'Andaman 5N/6D Couple Trip', source: 'Landing Page',
    stage: 'Negotiating', priority: 'Hot', travelers: 2, departureInDays: 50, assignedTo: 'Sneha Iyer', createdDaysAgo: 5,
    notes: 'Wants scuba at Havelock. Comparing with another agent.',
    followUps: [
      { daysAgo: 4, type: 'call', note: 'Explained Port Blair - Havelock - Neil itinerary. Sent quote ₹74,000.', done: true },
      { dueInDays: 1, hour: 16, type: 'call', note: 'Follow up on Andaman quote - offer free sea-walk if he confirms this week.' },
    ],
  },
  {
    key: 'meera', name: 'Meera Nair', phone: '9745088231', interest: 'Thailand 4N/5D (Phuket + Krabi)', source: 'Website',
    stage: 'Lost', priority: 'Cold', travelers: 2, departureInDays: 12, assignedTo: 'Sneha Iyer', createdDaysAgo: 28,
    notes: 'Lost - went with a cheaper group tour. Budget was ₹60k.',
    followUps: [
      { daysAgo: 26, type: 'email', note: 'Sent Thailand quote ₹78,000 for 2.', done: true },
      { daysAgo: 20, type: 'call', note: 'Client booked a group tour elsewhere at ₹62,000. Marked lost.', done: true },
    ],
  },
  {
    key: 'rohan', name: 'Rohan Desai', phone: '9769044512', interest: 'Ladakh Bike Trip 7N/8D', source: 'Referral',
    stage: 'New', priority: 'Warm', travelers: 4, departureInDays: 250, assignedTo: '', createdDaysAgo: 1,
    notes: '4 friends, want Royal Enfield from Manali to Leh in June next year.',
  },
  {
    key: 'kavya', name: 'Kavya Joshi', phone: '9922067841', interest: 'Goa Friends Trip 3N/4D', source: 'Excel Import',
    stage: 'Contacted', priority: 'Cold', travelers: 6, departureInDays: 90, assignedTo: 'Sneha Iyer', createdDaysAgo: 9,
    notes: 'Group of 6 friends, New Year in Goa. Price sensitive.',
    followUps: [
      { daysAgo: 8, type: 'whatsapp', note: 'Sent New Year Goa options. Waiting for group to decide.', done: true },
      { dueInDays: 4, hour: 12, type: 'whatsapp', note: 'Check if the group has finalised New Year dates.' },
    ],
  },
  {
    key: 'deepak', name: 'Deepak Agarwal', phone: '9829033456', interest: 'Shimla Manali 6N/7D Family', source: 'Website',
    stage: 'New', priority: 'Warm', travelers: 5, departureInDays: 70, assignedTo: 'Arjun Mehta', createdDaysAgo: 2,
    notes: 'Family of 5 from Jaipur. Wants Volvo + private cab.',
    chat: [
      [-2, '18:22', 'inbound', 'Hello, Shimla Manali package for 5 people? 2 kids. December end.'],
      [-2, '18:35', 'outbound', 'Hi Deepak ji! Yes, we have a 6N/7D Shimla-Manali family package. Can I call you tomorrow morning to understand your requirements?'],
      [-2, '18:40', 'inbound', 'Yes call after 11.'],
    ],
    followUps: [{ dueInDays: 0, hour: 11, type: 'call', note: 'Call Deepak after 11 AM for Shimla-Manali requirements.' }],
  },
];

const QUOTES = [
  {
    customer: 'amit', tripName: 'Dubai 4N/5D Family Package', priceQuote: 120000, status: 'Draft', validInDays: 5, daysAgo: 2,
    hotelCostPerPax: 14000, flightCostPerPax: 0, transportCostPerPax: 3500, otherCostPerPax: 7500,
    highlights: ['Burj Khalifa 124th floor', 'Desert Safari with BBQ dinner', 'Dhow Cruise Marina', 'Dubai Frame'],
    days: [
      ['Arrival in Dubai', 'Airport pickup, check-in at 4★ hotel in Bur Dubai. Evening free for Meena Bazaar.'],
      ['Dubai City Tour + Burj Khalifa', 'Half-day city tour: Jumeirah Mosque, Palm Jumeirah photo stop, Dubai Frame. Evening Burj Khalifa 124th floor.'],
      ['Desert Safari', 'Morning free. 3 PM pickup for desert safari with dune bashing, camel ride, tanoura show and BBQ dinner.'],
      ['Dhow Cruise Marina', 'Day at leisure / optional Miracle Garden. Evening Dhow Cruise dinner at Dubai Marina.'],
      ['Departure', 'Check-out and drop to Dubai International Airport.'],
    ],
    inclusions: ['4 nights 4★ hotel with breakfast', 'UAE tourist visa for 4', 'All transfers on private basis', 'Sightseeing as per itinerary'],
    exclusions: ['Flights', 'Lunch and dinner unless mentioned', 'Tourism Dirham fee'],
  },
  {
    customer: 'neha', tripName: 'Bali 5N/6D Honeymoon', priceQuote: 118000, status: 'Draft', validInDays: 10, daysAgo: 1,
    hotelCostPerPax: 32000, flightCostPerPax: 0, transportCostPerPax: 6000, otherCostPerPax: 8000,
    highlights: ['2 nights private pool villa in Ubud', 'Candlelight dinner at Jimbaran beach', 'Kintamani volcano view', 'Nusa Penida day trip'],
    days: [
      ['Arrival & Ubud', 'Airport pickup, transfer to private pool villa in Ubud. Floating breakfast next morning.'],
      ['Ubud Tour', 'Tegallalang rice terraces, Bali swing, Tegenungan waterfall, Ubud market.'],
      ['Kintamani', 'Kintamani volcano view lunch, coffee plantation, transfer to Seminyak.'],
      ['Nusa Penida', 'Full-day Nusa Penida tour: Kelingking beach, Broken beach, Angel\'s Billabong.'],
      ['Seminyak Leisure', 'Day at leisure. Evening candlelight dinner at Jimbaran beach.'],
      ['Departure', 'Check-out and airport drop.'],
    ],
    inclusions: ['2N Ubud pool villa + 3N Seminyak 4★', 'Daily breakfast', 'Private transfers', 'Candlelight dinner'],
    exclusions: ['Flights', 'Visa on arrival', 'Personal expenses'],
  },
  {
    customer: 'karan', tripName: 'Andaman 5N/6D Couple Trip', priceQuote: 74000, status: 'Draft', validInDays: 3, daysAgo: 4,
    hotelCostPerPax: 17000, flightCostPerPax: 0, transportCostPerPax: 7000, otherCostPerPax: 5000,
    highlights: ['Radhanagar Beach sunset', 'Scuba diving at Havelock', 'Cellular Jail light & sound show'],
    days: [
      ['Port Blair', 'Airport pickup, Cellular Jail visit and light & sound show.'],
      ['Havelock', 'Morning ferry to Havelock. Radhanagar Beach sunset.'],
      ['Scuba at Havelock', 'Scuba diving at Elephant Beach. Evening free.'],
      ['Neil Island', 'Ferry to Neil. Natural Bridge and Bharatpur beach.'],
      ['Port Blair', 'Ferry back to Port Blair, Corbyn\'s Cove beach.'],
      ['Departure', 'Airport drop.'],
    ],
    inclusions: ['5 nights hotels with breakfast', 'Ferry tickets', 'All transfers', 'One scuba dive'],
    exclusions: ['Flights', 'Lunch and dinner'],
  },
  {
    customer: 'pooja', tripName: 'Kerala 4N/5D Backwaters', priceQuote: 54000, status: 'Accepted', validInDays: -3, daysAgo: 11,
    hotelCostPerPax: 10700, flightCostPerPax: 0, transportCostPerPax: 6000, otherCostPerPax: 0,
    highlights: ['Tea gardens of Munnar', 'Overnight houseboat in Alleppey', 'Fort Kochi walk'],
    days: [
      ['Kochi to Munnar', 'Pickup from Kochi airport, drive to Munnar via Cheeyappara waterfalls.'],
      ['Munnar', 'Eravikulam National Park, tea museum, Mattupetty dam.'],
      ['Munnar to Alleppey', 'Drive to Alleppey, board private houseboat, cruise through backwaters.'],
      ['Alleppey to Kochi', 'Check-out from houseboat, Fort Kochi and Chinese fishing nets.'],
      ['Departure', 'Drop at Kochi airport.'],
    ],
    inclusions: ['2N Munnar resort + 1N houseboat + 1N Kochi', 'Breakfast daily, all meals on houseboat', 'Private Innova for all transfers'],
    exclusions: ['Flights', 'Entry tickets', 'Personal expenses'],
  },
  {
    customer: 'meera', tripName: 'Thailand 4N/5D (Phuket + Krabi)', priceQuote: 78000, status: 'Expired', validInDays: -20, daysAgo: 26,
    hotelCostPerPax: 16000, flightCostPerPax: 0, transportCostPerPax: 6000, otherCostPerPax: 6000,
    highlights: ['Phi Phi Island speedboat tour', 'Krabi 4-island tour'],
    days: [
      ['Arrival Phuket', 'Airport pickup, hotel check-in at Patong.'],
      ['Phi Phi Islands', 'Speedboat tour to Phi Phi and Maya Bay with lunch.'],
      ['Transfer to Krabi', 'Transfer to Ao Nang, evening free.'],
      ['Krabi 4 Islands', 'Longtail boat tour of 4 islands.'],
      ['Departure', 'Drop at Krabi airport.'],
    ],
    inclusions: ['4 nights hotels with breakfast', 'Tours as per itinerary', 'Transfers'],
    exclusions: ['Flights', 'Visa'],
  },
];

// ---------------------------------------------------------------------------

async function leadUuid(tenantId, leadIdText) {
  const { rows } = await query('SELECT id FROM leads WHERE tenant_id = $1 AND lead_id = $2', [tenantId, leadIdText]);
  return rows[0].id;
}

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) throw new Error('Usage: node scripts/seedDemoTenant.js <tenant-admin-email>');
  assertLocalDatabase();

  const owner = await userService.findUserByEmail(email);
  if (!owner) throw new Error(`No user with email ${email}.`);
  const tenantId = owner.tenantId;
  const ownerName = owner.name || 'Admin';
  const companyName = owner.companyName || 'Our Agency';
  if (!tenantId) throw new Error(`Could not resolve the tenant for ${email}.`);

  const { rows: existing } = await query('SELECT count(*)::int AS n FROM leads WHERE tenant_id = $1', [tenantId]);
  if (existing[0].n > 0) throw new Error(`Tenant already has ${existing[0].n} leads - refusing to seed twice.`);

  console.log(`Seeding tenant ${tenantId} (${companyName}) for ${email}\n`);

  // Agency profile shown on quotations and invoices.
  await query(
    `UPDATE settings SET address = $2, gst_number = $3, email_sender_name = $4, invoice_footer = $5,
       invoice_terms = $6, payment_account_name = $7
     WHERE tenant_id = $1`,
    [
      tenantId,
      '302, Sai Plaza, Andheri East, Mumbai, Maharashtra 400069',
      '27AAAAA0000A1Z5',
      companyName,
      'Thank you for travelling with us!',
      '25% advance to confirm. Balance 7 days before departure. Cancellation as per policy.',
      companyName,
    ]
  );

  // Team
  for (const m of TEAM) {
    if (!(await userService.findUserByEmail(m.email))) {
      await userService.createTeamMember(tenantId, { email: m.email, password: TEAM_PASSWORD, name: m.name, role: 'TEAM_MEMBER' });
    }
  }
  console.log(`✓ ${TEAM.length} team members`);

  // Hotels
  const hotelIds = {};
  for (const h of HOTELS) {
    const row = await hotelRepository.createHotel(tenantId, h);
    hotelIds[h.key] = row.id;
  }
  console.log(`✓ ${HOTELS.length} hotels`);

  // WhatsApp conversations first, so leads and bookings link to them.
  const chatIds = {};
  let messageCount = 0;
  for (const c of CUSTOMERS.filter((x) => x.chat)) {
    let lastInbound = null;
    for (const [days, time, direction, text] of c.chat) {
      const [hh, mm] = time.split(':').map(Number);
      const when = at(days, hh, mm);
      // Inbound rows are stored as 'read', the same as the Meta webhook does.
      const { chat } = await whatsappRepository.saveMessage(
        tenantId, c.phone, direction, text, c.name, 0, null, 'read', unix(when), 'text'
      );
      chatIds[c.key] = chat.id;
      if (direction === 'inbound') lastInbound = when;
      messageCount += 1;
    }
    // saveMessage stamps last_inbound_at with "now"; use the real last message time.
    await query(
      'UPDATE whatsapp_chats SET unread_count = $3, last_inbound_at = $4 WHERE tenant_id = $1 AND id = $2',
      [tenantId, chatIds[c.key], c.unread || 0, lastInbound]
    );
  }
  console.log(`✓ ${Object.keys(chatIds).length} WhatsApp chats, ${messageCount} messages`);

  // Leads
  const leads = {};
  for (const c of CUSTOMERS) {
    const lead = await leadService.createLead(tenantId, {
      customerName: c.name,
      email: `${c.key}.demo@example.com`,
      phone: c.phone,
      interest: c.interest,
      source: c.source,
      stage: c.stage === 'Won' ? 'Negotiating' : c.stage,
      assignedTo: c.assignedTo,
      notes: c.notes,
      travelers: c.travelers,
      departureDate: isoDate(c.departureInDays),
    }, c.assignedTo || ownerName);
    leads[c.key] = lead;
    const uuid = await leadUuid(tenantId, lead.leadId);

    const created = at(-c.createdDaysAgo, 10, 0);
    await query(
      'UPDATE leads SET priority = $3, created_at = $4, updated_at = $4 WHERE tenant_id = $1 AND id = $2',
      [tenantId, uuid, c.priority, created]
    );
    // The "Lead created" note createLead writes is history, not a task.
    await query(
      `UPDATE follow_up_logs SET created_at = $3, status = 'done' WHERE tenant_id = $1 AND lead_id = $2`,
      [tenantId, uuid, created]
    );
    if (chatIds[c.key]) await whatsappRepository.setChatLeadId(tenantId, chatIds[c.key], uuid);

    for (const f of c.followUps || []) {
      const row = await leadRepository.insertFollowUp(
        tenantId, lead.leadId, f.note, f.type,
        f.done ? null : at(f.dueInDays, f.hour || 11, 0).toISOString(),
        c.assignedTo || ownerName
      );
      await query(
        'UPDATE follow_up_logs SET created_at = $3, status = $4 WHERE tenant_id = $1 AND id = $2',
        [tenantId, row.id, f.done ? at(-f.daysAgo, 15, 0) : at(-1, 18, 0), f.done ? 'done' : 'pending']
      );
    }
  }
  console.log(`✓ ${CUSTOMERS.length} leads with follow-ups`);

  // Quotations
  for (const q of QUOTES) {
    const c = CUSTOMERS.find((x) => x.key === q.customer);
    const quote = await quotationService.createQuotation(tenantId, {
      customerName: c.name,
      email: `${c.key}.demo@example.com`,
      phone: c.phone,
      tripName: q.tripName,
      priceQuote: q.priceQuote,
      validUntil: isoDate(q.validInDays),
      status: q.status,
      itineraryDays: q.days.map(([title, description], i) => ({ day: i + 1, title: `Day ${i + 1}: ${title}`, description })),
      inclusions: q.inclusions,
      exclusions: q.exclusions,
      highlights: q.highlights,
      hotelCostPerPax: q.hotelCostPerPax,
      flightCostPerPax: q.flightCostPerPax,
      transportCostPerPax: q.transportCostPerPax,
      otherCostPerPax: q.otherCostPerPax,
    });
    q.quotationId = quote.quotationId;
    await query('UPDATE quotations SET created_at = $3, updated_at = $3 WHERE tenant_id = $1 AND quotation_id = $2',
      [tenantId, quote.quotationId, at(-q.daysAgo, 14, 0)]);
  }
  console.log(`✓ ${QUOTES.length} quotations`);

  // Group batch for the Char Dham booking
  const batch = await batchService.createBatch(tenantId, {
    name: 'Char Dham Yatra - November Group',
    tripName: 'Char Dham Yatra 9N/10D',
    departureDate: isoDate(35),
    totalCapacity: 24,
    pricePerPerson: 28000,
    status: 'Confirmed',
    notes: 'Haridwar departure. Tempo Travellers booked. Helicopter for Kedarnath optional.',
  }, ownerName);
  const { rows: batchRows } = await query('SELECT id FROM tour_batches WHERE tenant_id = $1 AND batch_id = $2', [tenantId, batch.batchId]);
  const batchUuid = batchRows[0].id;

  // Bookings - built the way bookingService.createBooking does, minus the
  // confirmation WhatsApp/email and auto-expenses it fires for "Booked".
  let paymentCount = 0;
  const bookingUuids = {};
  const bookingIds = {};
  const bookingCustomers = CUSTOMERS.filter((x) => x.booking);
  for (const c of bookingCustomers) {
    const b = c.booking;
    const members = c.travelers;
    const totalAmount = members * b.pricePerPerson;
    const bookingId = `BK-${Date.now()}-${c.key.slice(0, 4).toUpperCase()}`;
    const createdAt = at(-c.createdDaysAgo + 1, 12, 0);
    const actor = c.assignedTo || ownerName;
    const contact = { name: c.name, email: `${c.key}.demo@example.com`, phone: c.phone };
    const customerId = await customerService.upsertFromContact(tenantId, contact);

    const row = await bookingRepository.insertBooking(
      tenantId, bookingId,
      {
        customerName: c.name, email: contact.email, phone: c.phone, trip: b.trip,
        departure: isoDate(c.departureInDays), pickup: b.pickupLocation, members, pricePerPerson: b.pricePerPerson,
        teamMember: c.assignedTo, notes: c.notes,
        vendorHotelCost: b.vendorHotelCost, vendorTransportCost: b.vendorTransportCost, vendorOtherCost: b.vendorOtherCost,
        hotelId: b.hotel ? hotelIds[b.hotel] : null, roomCategory: b.roomCategory, mealPlan: b.mealPlan,
        hotelBookingStatus: b.hotelBookingStatus, hotelConfirmationNo: b.hotelConfirmationNo,
        hotelCheckIn: b.checkInDays != null ? isoDate(b.checkInDays) : null,
        hotelCheckOut: b.checkOutDays != null ? isoDate(b.checkOutDays) : null,
        vehicleType: b.vehicleType, driverName: b.driverName, driverPhone: b.driverPhone, vehicleNumber: b.vehicleNumber,
        pickupTime: b.pickupTime, pickupLocation: b.pickupLocation, dropLocation: b.dropLocation,
        sourceQuotationId: QUOTES.find((q) => q.customer === c.key && q.status === 'Accepted')?.quotationId || null,
      },
      createdAt.toISOString(), 0, totalAmount, totalAmount, b.travelStatus, 'Pending', actor, customerId
    );
    bookingUuids[c.key] = row.id;
    bookingIds[c.key] = bookingId;

    await bookingRepository.insertFollowUp(tenantId, bookingId, `Booking created. Travel Status set to *${b.travelStatus}*.`, 'note', null, actor);
    await whatsappRepository.linkBookingToChatByPhone(tenantId, c.phone, row.id);

    const lUuid = await leadUuid(tenantId, leads[c.key].leadId);
    await query('UPDATE bookings SET lead_id = $3, batch_id = $4 WHERE tenant_id = $1 AND id = $2',
      [tenantId, row.id, lUuid, b.batch ? batchUuid : null]);
    await query(`UPDATE leads SET stage = 'Won', converted_booking_id = $3 WHERE tenant_id = $1 AND id = $2`,
      [tenantId, lUuid, bookingId]);

    for (const p of b.payments) {
      await bookingService.addPayment(tenantId, bookingId, {
        amount: p.amount, method: p.method, reference: p.reference, paidOn: isoDate(-p.daysAgo),
        notes: p.amount === totalAmount ? 'Full payment' : 'Advance / instalment', createdBy: actor,
      });
      paymentCount += 1;
    }
    await query(`UPDATE follow_up_logs SET created_at = $3, status = 'done' WHERE tenant_id = $1 AND booking_id = $2`,
      [tenantId, row.id, createdAt]);
  }

  // An open task on the booking whose balance is still due.
  await bookingRepository.insertFollowUp(
    tenantId, bookingIds.pooja, 'Collect balance ₹29,000 from Pooja before departure.', 'whatsapp',
    at(3, 11, 0).toISOString(), 'Sneha Iyer'
  );
  console.log(`✓ ${bookingCustomers.length} bookings, ${paymentCount} payments, 1 group batch (${batch.batchId})`);

  // Expenses
  const expenses = [
    { title: 'Snow Peak Retreat - 5 nights', amount: 38000, category: 'Hotel', link_type: 'booking', booking_id: bookingUuids.vikram, vendor_name: 'Snow Peak Retreat', status: 'Paid' },
    { title: 'Innova Crysta - Manali local', amount: 14000, category: 'Transport', link_type: 'booking', booking_id: bookingUuids.vikram, vendor_name: 'Himalayan Cabs', status: 'Pending' },
    { title: 'Tea Valley Resort - 2 nights', amount: 11600, category: 'Hotel', link_type: 'booking', booking_id: bookingUuids.pooja, vendor_name: 'Tea Valley Resort', status: 'Paid' },
    { title: 'Houseboat - 1 night', amount: 9800, category: 'Hotel', link_type: 'booking', booking_id: bookingUuids.pooja, vendor_name: 'Lake Palace Houseboats', status: 'Pending' },
    { title: 'Rajasthan hotels (3 cities)', amount: 36000, category: 'Hotel', link_type: 'booking', booking_id: bookingUuids.ananya, vendor_name: 'Haveli Heritage Stay', status: 'Paid' },
    { title: 'Dzire - 7 days Rajasthan', amount: 21000, category: 'Transport', link_type: 'booking', booking_id: bookingUuids.ananya, vendor_name: 'Marwar Travels', status: 'Paid' },
    { title: 'Tempo Traveller advance', amount: 20000, category: 'Transport', link_type: 'batch', batch_id: batchUuid, vendor_name: 'Devbhoomi Tours & Travels', status: 'Paid' },
    { title: 'Instagram ads - September', amount: 8500, category: 'Other', link_type: 'general', vendor_name: 'Meta Ads', status: 'Paid' },
  ];
  for (const e of expenses) {
    await expenseRepository.createExpense(tenantId, { ...e, created_by: ownerName });
  }
  console.log(`✓ ${expenses.length} expenses`);

  console.log(`\nDone. Log in as ${email}.`);
  console.log(`Team logins: ${TEAM.map((m) => m.email).join(', ')} / ${TEAM_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(`\n✗ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
