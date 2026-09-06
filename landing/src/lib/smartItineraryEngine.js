/**
 * Smart Travel Itinerary Generator & Parser
 * Comprehensive Real-Data Knowledge Base covering All Over India and Popular International Circuits.
 * Features realistic transit routing (e.g. Delhi to Delhi), famous trending attractions,
 * authentic local food, stays, inclusions, and exclusions.
 */

import { getIndianDestinationRealData } from "./smartItineraryEngine.data.js";

// ==========================================
// 1. ROUTE & TRAVEL SPECS PARSER
// ==========================================
export function extractTravelSpecs(commandText = "", defaultDestination = "") {
  const text = (commandText || "").trim();
  let origin = "";
  let returnCity = "";
  let viaCity = "";
  let vehicle = "Private AC Vehicle";
  let isOvernight = false;

  // 1. Overnight transit detection
  if (/overnight|over\s*night|night\s*(?:drive|journey|travel|departure|start)|raat\s*ko/i.test(text)) {
    isOvernight = true;
  }

  // 2. Vehicle detection
  if (/tempo\s*traveller|traveller|force\s*traveller|tempo/i.test(text)) {
    vehicle = "AC Tempo Traveller";
  } else if (/volvo|luxury\s*bus|ac\s*bus|bus/i.test(text)) {
    vehicle = "AC Volvo Bus";
  } else if (/innova\s*crysta|crysta/i.test(text)) {
    vehicle = "Innova Crysta AC";
  } else if (/innova|ertiga|scorpio|suv/i.test(text)) {
    vehicle = "Dedicated AC SUV";
  } else if (/sedan|dzire|etios/i.test(text)) {
    vehicle = "Dedicated AC Sedan";
  } else if (/train|shatabdi|vandebharat|vande\s*bharat/i.test(text)) {
    vehicle = "Express Train";
  } else if (/flight|air/i.test(text)) {
    vehicle = "Flight";
  }

  // 3. Via / Route cities (e.g. "from Delhi to Haridwar", "via Haridwar", "via Dehradun")
  const viaMatch = text.match(/\b(?:via|through|hote\s+hue)\s+([a-zA-Z]+)/i) ||
                   text.match(/\b(?:from|starting\s+from)\s+[a-zA-Z]+\s+to\s+([a-zA-Z]+)(?:\s*,|\s+to|\s+overnight|\s+will|\s+by|\s+with|$)/i);
  if (viaMatch && viaMatch[1]) {
    const candidate = viaMatch[1].toLowerCase();
    const destLower = (defaultDestination || "").toLowerCase();
    if (!destLower.includes(candidate) && candidate !== "delhi") {
      viaCity = viaMatch[1].charAt(0).toUpperCase() + viaMatch[1].slice(1).toLowerCase();
    }
  }

  // 4. Same city roundtrip (e.g. "Delhi to Delhi")
  const sameCityMatch = text.match(/\b([a-zA-Z]+)\s*(?:to|-|se)\s*\1\b/i);
  if (sameCityMatch) {
    origin = sameCityMatch[1];
    returnCity = sameCityMatch[1];
  }

  // 5. "from [City]" or "[City] se"
  if (!origin) {
    const fromMatch = text.match(/(?:from|starting\s+from|departs?\s+from)\s+([a-zA-Z]+)/i) ||
                      text.match(/\b([a-zA-Z]+)\s+se\s+(?:start|shuru|nikal|to)/i) ||
                      text.match(/\b([a-zA-Z]+)\s+se\b/i);
    if (fromMatch) {
      origin = fromMatch[1];
      returnCity = origin;
    }
  }

  // 6. "[Major Hub] to [Destination]"
  if (!origin) {
    const toMatch = text.match(/\b([a-zA-Z]+)\s+to\s+([a-zA-Z]+)/i);
    if (toMatch) {
      const c1 = toMatch[1].toLowerCase();
      const majorHubs = [
        "delhi", "mumbai", "bangalore", "bengaluru", "kolkata", "chennai", "hyderabad",
        "pune", "ahmedabad", "chandigarh", "jaipur", "lucknow", "surat", "haridwar",
        "rishikesh", "dehradun", "guwahati", "cochin", "kochi", "nagpur", "indore"
      ];
      if (majorHubs.includes(c1)) {
        origin = toMatch[1];
        returnCity = toMatch[1];
      }
    }
  }

  if (origin) origin = origin.charAt(0).toUpperCase() + origin.slice(1).toLowerCase();
  if (returnCity) returnCity = returnCity.charAt(0).toUpperCase() + returnCity.slice(1).toLowerCase();

  return { origin, returnCity, viaCity, vehicle, isOvernight };
}

export function extractRouteAndOrigin(commandText = "", defaultDestination = "") {
  const specs = extractTravelSpecs(commandText, defaultDestination);
  return { origin: specs.origin, returnCity: specs.returnCity };
}

// ==========================================
// 2. DESTINATION RESOLVER & ALIAS REGISTRY
// ==========================================
export const DEST_ALIASES = [
  { key: "mussoorie", canonical: "Mussoorie", regex: /\b(?:mussoorie|mussorie|mussoori|mansoori|mansuri|queen\s+of\s+hills)\b/i },
  { key: "nainital", canonical: "Nainital", regex: /\b(?:nainital|naini\s*tal|bhimtal|naukuchiatal|sattal)\b/i },
  { key: "rishikesh", canonical: "Rishikesh", regex: /\b(?:rishikesh|haridwar|shivpuri)\b/i },
  { key: "chopta", canonical: "Chopta Tungnath", regex: /\b(?:chopta|tungnath|chandrashila|deoria\s*tal|deoriatal)\b/i },
  { key: "harshil", canonical: "Harsil Valley", regex: /\b(?:harshil|harsil|dharali|gangotri|mukhba)\b/i },
  { key: "aadrai", canonical: "Aadrai Jungle Trek", regex: /\b(?:aadrai|adrai|malshej)\b/i },
  { key: "manali", canonical: "Manali", regex: /\b(?:manali|solang|rohtang|atal\s*tunnel|sissu)\b/i },
  { key: "shimla", canonical: "Shimla", regex: /\b(?:shimla|kufri|mashobra|chail|narkanda)\b/i },
  { key: "kasol", canonical: "Kasol", regex: /\b(?:kasol|tosh|parvati\s*valley|manikaran|kheerganga)\b/i },
  { key: "jibhi", canonical: "Jibhi", regex: /\b(?:jibhi|tirthan|jalori|chehni)\b/i },
  { key: "spiti", canonical: "Spiti Valley", regex: /\b(?:spiti|kaza|chandratal|hikkim|langza|komic|chicham)\b/i },
  { key: "auli", canonical: "Auli", regex: /\b(?:auli|joshimath|gorson)\b/i },
  { key: "kedarnath", canonical: "Kedarnath", regex: /\b(?:kedarnath|kedar|gaurikund|sonprayag)\b/i },
  { key: "badrinath", canonical: "Badrinath", regex: /\b(?:badrinath|mana\s*village)\b/i },
  { key: "corbett", canonical: "Jim Corbett", regex: /\b(?:corbett|jim\s*corbett|dhikala|ramnagar)\b/i },
  { key: "dharamshala", canonical: "Dharamshala", regex: /\b(?:dharamshala|dharamsala|mcleodganj|mcleod\s*ganj|bir\s*billing)\b/i },
  { key: "dalhousie", canonical: "Dalhousie", regex: /\b(?:dalhousie|khajjiar)\b/i },
  { key: "ladakh", canonical: "Leh Ladakh", regex: /\b(?:ladakh|leh|pangong|nubra|khardung\s*la)\b/i },
  { key: "kashmir", canonical: "Kashmir", regex: /\b(?:kashmir|srinagar|gulmarg|pahalgam|sonamarg)\b/i },
  { key: "jaipur", canonical: "Jaipur", regex: /\b(?:jaipur|pink\s*city|amer)\b/i },
  { key: "udaipur", canonical: "Udaipur", regex: /\b(?:udaipur|lake\s*city|pichola)\b/i },
  { key: "jaisalmer", canonical: "Jaisalmer", regex: /\b(?:jaisalmer|sam\s*sand\s*dunes|golden\s*city)\b/i },
  { key: "jodhpur", canonical: "Jodhpur", regex: /\b(?:jodhpur|blue\s*city|mehrangarh)\b/i },
  { key: "pushkar", canonical: "Pushkar", regex: /\b(?:pushkar|ajmer)\b/i },
  { key: "goa", canonical: "Goa", regex: /\b(?:goa|calangute|baga|anjuna|palolem|dudhsagar)\b/i },
  { key: "munnar", canonical: "Munnar", regex: /\b(?:munnar|eravikulam|mattupetty)\b/i },
  { key: "alleppey", canonical: "Alleppey", regex: /\b(?:alleppey|alappuzha|houseboat|backwaters)\b/i },
  { key: "kerala", canonical: "Kerala", regex: /\b(?:kerala|thekkady|wayanad|kochi)\b/i },
  { key: "coorg", canonical: "Coorg", regex: /\b(?:coorg|madikeri|kushalnagar)\b/i },
  { key: "ooty", canonical: "Ooty", regex: /\b(?:ooty|coonoor|nilgiris?)\b/i },
  { key: "hampi", canonical: "Hampi", regex: /\b(?:hampi|vijayanagara)\b/i },
  { key: "gokarna", canonical: "Gokarna", regex: /\b(?:gokarna|murudeshwar)\b/i },
  { key: "pondicherry", canonical: "Pondicherry", regex: /\b(?:pondicherry|puducherry|auroville)\b/i },
  { key: "meghalaya", canonical: "Meghalaya", regex: /\b(?:meghalaya|shillong|cherrapunji|sohra|dawki|mawlynnong)\b/i },
  { key: "darjeeling", canonical: "Darjeeling", regex: /\b(?:darjeeling|tiger\s*hill)\b/i },
  { key: "sikkim", canonical: "Sikkim", regex: /\b(?:sikkim|gangtok|tsomgo|nathula|lachung)\b/i },
  { key: "varanasi", canonical: "Varanasi", regex: /\b(?:varanasi|kashi|banaras|ayodhya)\b/i },
  { key: "amritsar", canonical: "Amritsar", regex: /\b(?:amritsar|golden\s*temple|wagah)\b/i },
  { key: "andaman", canonical: "Andaman", regex: /\b(?:andaman|havelock|port\s*blair|swaraj\s*dweep|radhanagar)\b/i },
  { key: "kutch", canonical: "Rann of Kutch", regex: /\b(?:kutch|rann\s*of\s*kutch|white\s*rann)\b/i },
  { key: "mahabaleshwar", canonical: "Mahabaleshwar", regex: /\b(?:mahabaleshwar|lonavala|khandala|panchgani|matheran)\b/i },
  { key: "dubai", canonical: "Dubai", regex: /\b(?:dubai|burj\s*khalifa|dhow)\b/i },
  { key: "bali", canonical: "Bali", regex: /\b(?:bali|ubud|kuta|seminyak)\b/i },
  { key: "thailand", canonical: "Thailand", regex: /\b(?:thailand|bangkok|phuket|pattaya|krabi)\b/i },
];

export function resolveDestination(destinationInput = "", commandInput = "") {
  const dClean = (destinationInput || "").trim();
  const cClean = (commandInput || "").trim();
  const combined = `${dClean} ${cClean}`.trim();

  // 1. Check destination input first
  for (const item of DEST_ALIASES) {
    if (item.regex.test(dClean)) {
      return { key: item.key, canonical: item.canonical };
    }
  }

  // 2. Check combined text
  for (const item of DEST_ALIASES) {
    if (item.regex.test(combined)) {
      return { key: item.key, canonical: item.canonical };
    }
  }

  const fallback = dClean && dClean.toLowerCase() !== "destination" ? dClean : "Custom Destination";
  const words = fallback.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return { key: null, canonical: words.join(" ") };
}

// ==========================================
// 3. MASTER PRESET DESTINATION TEMPLATES
// ==========================================
export const DESTINATION_TEMPLATES = {
  mussoorie: {
    title: (days, origin, returnCity, specs = {}) => {
      const vehicle = specs.vehicle || "Private AC Cab";
      const vehicleLabel = vehicle.includes("Tempo") ? "by AC Tempo Traveller" : (vehicle.includes("Volvo") ? "by AC Volvo" : "");
      return origin
        ? `🌲 Queen of Hills Mussoorie ${days}D/${Math.max(1, days - 1)}N Tour ${vehicleLabel} (${origin} to ${returnCity || origin})`.replace(/\s+/g, ' ')
        : `🌲 Queen of Hills Mussoorie & Landour ${days}D/${Math.max(1, days - 1)}N Getaway`;
    },
    days: (days, origin, returnCity, specs = {}) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      const vehicle = specs.vehicle || "Private AC Vehicle";
      const isOvernight = !!specs.isOvernight;
      const viaCity = specs.viaCity || "Dehradun";

      const day1Title = isOvernight
        ? `Overnight Journey from ${fromCity} by ${vehicle} & Arrival in Mussoorie via ${viaCity}`
        : `Scenic Drive from ${fromCity} to Mussoorie via ${viaCity}`;

      const day1Morning = isOvernight
        ? `Morning (06:30 AM): Early morning arrival in Mussoorie after a comfortable overnight journey from ${fromCity} by ${vehicle} (departing late evening via Delhi-Meerut Expressway). En-route halt at ${viaCity} for morning freshen-up and hot breakfast.`
        : `Morning (05:30 AM): Pick-up from ${fromCity} by dedicated ${vehicle}. Drive along the smooth Delhi-Meerut Expressway and Saharanpur/${viaCity} highway (approx 280 km / 6-7 hours).`;

      const day1Afternoon = `Afternoon: En-route stop for lunch at a popular highway eatery. Ascend the scenic hill curves from ${viaCity} to Mussoorie (6,580 ft). Check-in to your valley-view hotel, unpack, and relax. Drive to the iconic Kempty Waterfalls cascading down 40 ft into natural pools. Visit nearby Company Garden.`;
      const day1Evening = `Evening: Stroll along vibrant Mall Road, Kulri Bazaar, and Library Chowk. Enjoy hot chocolate or hot Tibetan momos and ride the ropeway cable car to Gun Hill for golden-hour sunset panoramas over Doon Valley.`;

      const day1 = {
        title: day1Title,
        points: [
          day1Morning,
          day1Afternoon,
          day1Evening,
          `Stay: Deluxe Valley View Hotel in Mussoorie.`
        ]
      };

      // 2 DAYS / 1 NIGHT WEEKEND TRIP
      if (days === 2) {
        const day2 = {
          title: `Landour Heritage, Lal Tibba, George Everest Peak & Return Journey to ${toCity} by ${vehicle}`,
          points: [
            `Morning: Early morning scenic drive to colonial Landour cantonment. Visit Lal Tibba (highest point in Mussoorie) for telescope views of Gangotri, Kedarnath, and Badrinath snow peaks. Enjoy hot breakfast at historic Char Dukan (famous waffles, pancakes & ginger lemon tea) and visit St. Paul's Church.`,
            `Afternoon: Drive to Sir George Everest Peak & House for breathtaking 360-degree views of Great Himalayas and Doon Valley. Walk along Camel's Back Road for nature views.`,
            `Evening: Check-out from hotel and board your ${vehicle} for comfortable return journey back to ${toCity} via ${viaCity}. Arrive in ${toCity} by late evening with cherished Queen of Hills memories!`
          ]
        };
        return [day1, day2];
      }

      // 3 DAYS / 2 NIGHTS TRIP
      if (days === 3) {
        const day2 = {
          title: "Kempty Waterfalls, George Everest Peak & Cloud's End",
          points: [
            `Morning: Early morning drive to the iconic Kempty Waterfalls cascading down 40 feet. Enjoy mountain pool photography and refreshing mountain breeze before peak crowds.`,
            `Afternoon: Drive to Sir George Everest House and hike up to George Everest Peak for 360-degree panoramic views of snow-capped Himalayan ranges and the Aglar Valley.`,
            `Evening: Explore the tranquil pine forest trails of Cloud's End and visit the scenic Company Garden with its flower nursery. Return to hotel for dinner.`,
            `Stay: Deluxe Valley View Hotel in Mussoorie.`
          ]
        };
        const day3 = {
          title: `Landour Heritage, Lal Tibba, Char Dukan & Return Drive to ${toCity} by ${vehicle}`,
          points: [
            `Morning: Early morning scenic drive to colonial Landour cantonment. Visit historic Char Dukan, taste famous apple pie, ginger lemon tea & pancakes, and view Great Himalayan snow peaks through telescope at Lal Tibba (highest point in Mussoorie).`,
            `Afternoon: Visit Camel's Back Road for nature views. Check-out from hotel and begin the scenic downhill drive towards ${viaCity}.`,
            `Evening: Smooth highway drive returning back to ${toCity} by ${vehicle}. Drop-off at your designated point with cherished Queen of Hills memories!`
          ]
        };
        return [day1, day2, day3];
      }

      // 4+ DAYS TRIP
      const day2 = {
        title: "Kempty Waterfalls, George Everest Peak & Cloud's End",
        points: [
          `Morning: Early morning drive to the iconic Kempty Waterfalls cascading down 40 feet. Enjoy mountain pool photography and refreshing mountain breeze before peak crowds.`,
          `Afternoon: Drive to Sir George Everest House and hike up to George Everest Peak for 360-degree panoramic views of snow-capped Himalayan ranges and the Aglar Valley.`,
          `Evening: Explore the tranquil pine forest trails of Cloud's End and visit the scenic Company Garden with its flower nursery. Return to hotel for dinner.`,
          `Stay: Deluxe Valley View Hotel in Mussoorie.`
        ]
      };
      const day3 = {
        title: "Landour Charm, Lal Tibba & Dhanaulti Eco Park Excursion",
        points: [
          `Morning: Drive to tranquil Landour cantonment. Visit historic Char Dukan, taste famous apple pie, and view snow peaks through telescope at Lal Tibba.`,
          `Afternoon: Excursion to serene Dhanaulti (24 km). Walk among towering deodars in Amber & Dhara Eco Parks and visit the hilltop Surkanda Devi Temple.`,
          `Evening: Drive back to Mussoorie. Enjoy evening cafe hopping and shopping for handmade wooden souvenirs on Mall Road.`,
          `Stay: Deluxe Valley View Hotel in Mussoorie.`
        ]
      };
      const day4 = {
        title: `Camel's Back Road, Company Garden & Return Drive to ${toCity} by ${vehicle}`,
        points: [
          `Morning: Leisurely walk along Camel's Back Road rock formations. Visit Company Garden and Tibetan Monastery.`,
          `Afternoon: Check-out and begin scenic downhill drive via ${viaCity}.`,
          `Evening: Return drive back to ${toCity} by ${vehicle} with sweet mountain memories!`
        ]
      };
      return [day1, day2, day3, day4];
    },
    inclusions: [
      "Deluxe Hotel Stay overlooking Doon Valley",
      "Daily Buffet Breakfast & Dinner (MAP Plan)",
      "Dedicated Private AC Transport for entire trip including transfers and local sightseeing",
      "Full-day excursion to Kempty Falls, George Everest, Landour & Lal Tibba",
      "Driver allowances, mountain road tolls, green cess, and parking charges"
    ],
    exclusions: [
      "Ropeway cable car tickets at Gun Hill and adventure activities at Kempty",
      "Personal shopping, cafe bills at Landour Char Dukan, and laundry",
      "En-route lunch meals and tips"
    ],
    tips: [
      "Landour roads are narrow; walking or taking a smaller local cab is recommended for Char Dukan.",
      "Start early for Kempty Falls by 8:30 AM to avoid heavy traffic and crowded swimming pools.",
      "Carry light woolens during summer and heavy jackets with thermals during winter (Nov-Feb)."
    ]
  },

  nainital: {
    title: (days, origin, returnCity) =>
      origin
        ? `⛵ Nainital Lake District ${days}D/${Math.max(1, days - 1)}N Holiday (${origin} to ${returnCity || origin})`
        : `⛵ Nainital Lake District ${days}D/${Math.max(1, days - 1)}N Tour Package`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      return [
        {
          title: `Drive from ${fromCity} to Nainital & Evening Naini Lake Promenade`,
          points: [
            `Morning: Early departure from ${fromCity}. Scenic highway drive via Hapur, Moradabad, and Haldwani. Ascend the Shivalik hills via Kathgodam to Nainital (6,837 ft, approx. 310 km / 6-7 hrs).`,
            `Afternoon: Reach Nainital and check-in to your hotel with Naini Lake views. Unpack and freshen up.`,
            `Evening: Stroll along Mall Road and Thandi Sadak. Visit sacred Naina Devi Temple on the northern shore of the lake. Savor hot momos and thukpa at the Tibetan Market.`,
            `Stay: Premium Lake View Hotel in Nainital.`
          ]
        },
        {
          title: "Naini Lake Boating, Snow View Point & Tiffin Top",
          points: [
            `Morning: Experience yachting / traditional wooden boat ride across the pear-shaped Naini Lake surrounded by seven green hills. Take the Aerial Ropeway cable car to Snow View Point (7,450 ft) for vistas of Nanda Devi.`,
            `Afternoon: Gentle hike or horseback ride to Tiffin Top (Dorothy's Seat) offering 360-degree views of Nainital town and surrounding Kumaon hills. Visit Eco Cave Gardens featuring six natural animal-shaped caves.`,
            `Evening: Stroll along Mallital and Bhutia Market for handcrafted decorative candles and pine cone artifacts. Dinner at a lakeview restaurant.`,
            `Stay: Premium Lake View Hotel in Nainital.`
          ]
        },
        {
          title: "Lake Tour Excursion: Bhimtal, Sattal & Naukuchiatal",
          points: [
            `Morning: Hearty breakfast. Drive to Bhimtal (22 km), larger than Naini Lake, featuring an island aquarium in the center. Visit the ancient Bhimeshwar Mahadev Temple.`,
            `Afternoon: Continue to Naukuchiatal (the nine-cornered lake) for thrilling paragliding flights and kayaking. Stop at Sattal (seven interconnected freshwater lakes) nestled in dense pine and oak forests.`,
            `Evening: Return to Nainital for a quiet lakeside dinner.`,
            `Stay: Premium Lake View Hotel in Nainital.`
          ]
        },
        {
          title: `Mukteshwar / Kilbury Bird Trail & Return Drive to ${toCity}`,
          points: [
            `Morning: Breakfast at hotel, pack bags and check-out. Take a morning drive to Kilbury & Pangot bird sanctuary or Mukteshwar Chauli Ki Jali.`,
            `Afternoon: Begin comfortable downhill drive via Kathgodam back towards ${toCity}.`,
            `Evening: Reach ${toCity} by late evening with unforgettable memories of the Lake District!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in Lake-View Hotel in Nainital",
      "Daily Buffet Breakfast & Dinner (MAP Plan)",
      "Dedicated Private AC Cab for Delhi-Nainital-Delhi transfers & full sightseeing",
      "Lake-Tour excursion to Bhimtal, Sattal & Naukuchiatal",
      "Toll taxes, mountain state permits, parking fees, and driver allowances"
    ],
    exclusions: [
      "Boating charges, cable car ropeway tickets, and paragliding fees",
      "Horse riding charges at Tiffin Top",
      "Personal shopping and en-route lunches"
    ],
    tips: [
      "Nainital Mall Road is closed to private vehicles in the evening; enjoy leisurely walking.",
      "Pre-book paragliding in Naukuchiatal with certified pilots only."
    ]
  },

  rishikesh: {
    title: (days, origin, returnCity) =>
      origin
        ? `🌊 Rishikesh & Haridwar Spiritual & River Rafting ${days}D/${Math.max(1, days - 1)}N Tour (${origin} to ${returnCity || origin})`
        : `🌊 Rishikesh & Haridwar Yoga & Adventure ${days}D/${Math.max(1, days - 1)}N Package`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      return [
        {
          title: `Drive from ${fromCity} to Rishikesh & Triveni Ghat Ganga Aarti`,
          points: [
            `Morning: Early departure from ${fromCity} via Delhi-Meerut Expressway. Smooth 4.5-hour drive (approx. 240 km) to the World Yoga Capital, Rishikesh.`,
            `Afternoon: Check-in to riverside resort / boutique hotel in Tapovan / Shivpuri. Relax and freshen up.`,
            `Evening: Visit Triveni Ghat or Parmarth Niketan for the world-famous Maha Ganga Aarti with rhythmic Vedic chants, brass lamps, and floating flower diyas.`,
            `Stay: Riverside Resort / Deluxe Hotel in Rishikesh.`
          ]
        },
        {
          title: "Thrilling White Water Rafting, Cliff Jumping & The Beatles Ashram",
          points: [
            `Morning: Gear up with lifejackets and helmets for thrilling 16 km White Water River Rafting from Shivpuri down to NIM Beach. Conquer famous Grade III rapids like 'Roller Coaster', 'Golf Course', and 'Club House', plus cliff jumping from 25 ft.`,
            `Afternoon: Return to hotel to change. Visit the historic The Beatles Ashram (Chaurasi Kutia) featuring Maharishi Mahesh Yogi's meditation huts and graffiti art.`,
            `Evening: Walk across iconic Ram Jhula & Lakshman Jhula suspension bridges. Organic cafe-hopping in Tapovan (falafel, wood-fired pizza, and herbal smoothies).`,
            `Stay: Riverside Resort / Deluxe Hotel in Rishikesh.`
          ]
        },
        {
          title: `Neer Garh Waterfalls, Har Ki Pauri Haridwar & Return Drive to ${toCity}`,
          points: [
            `Morning: Hike to the cascading Neer Garh Waterfall for a refreshing natural pool dip. Enjoy breakfast with panoramic Ganga views.`,
            `Afternoon: Check-out and drive via Haridwar. Visit holy Har Ki Pauri and Mansa Devi Temple via ropeway.`,
            `Evening: Smooth return drive back to ${toCity}. Drop-off with blessed memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in Riverside Resort / Deluxe Hotel",
      "Daily Breakfast & Dinner",
      "16 KM White Water Rafting session with certified river guide & safety kayaker",
      "Private AC Cab for transfers and sightseeing",
      "Tolls, parking, and driver allowances"
    ],
    exclusions: [
      "Bungee jumping, flying fox, or giant swing charges at Mohan Chatti",
      "Beatles Ashram entry tickets",
      "Personal expenses and lunches"
    ],
    tips: [
      "Rishikesh is a strictly vegetarian and alcohol-free holy city.",
      "Wear quick-drying clothes and sports sandals for river rafting."
    ]
  },

  chopta: {
    title: (days, origin, returnCity) =>
      origin
        ? `🏔️ Chopta Tungnath & Chandrashila ${days}D/${Math.max(1, days - 1)}N Trek (${origin} to ${returnCity || origin})`
        : `🏔️ Chopta Tungnath & Chandrashila ${days}D/${Math.max(1, days - 1)}N Himalayan Trek`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      return [
        {
          title: `Scenic Mountain Drive from ${fromCity} to Chopta / Sari via Devprayag`,
          points: [
            `Morning: Early departure from ${fromCity} via Meerut Expressway to Haridwar / Rishikesh. Ascend along the roaring Alaknanda River.`,
            `Afternoon: Stop at sacred Devprayag to witness the holy confluence of Alaknanda and Bhagirathi forming River Ganga. Continue via Rudraprayag and Kund to Chopta (8,790 ft).`,
            `Evening: Arrive in Chopta / Sari alpine village. Savor hot Garhwali ginger tea and admire sunset reflections over Chaukhamba peaks.`,
            `Stay: Swiss Alpine Camps or Cozy Mountain Cottage in Chopta / Sari.`
          ]
        },
        {
          title: "The Sacred Tungnath Temple & Chandrashila Peak Summit (13,123 ft)",
          points: [
            `Morning (06:00 AM): Light breakfast. Drive to Chopta base trailhead. Begin paved stone trek (3.5 km) through rhododendron forests to Tungnath Temple — the highest Shiva shrine in the world (12,073 ft).`,
            `Afternoon: Pray at the ancient Tungnath Temple, then ascend the steep 1 km ridge to Chandrashila Summit (13,123 ft). Experience 360-degree panoramic views of Chaukhamba, Nanda Devi, Trishul, and Kedar Dome.`,
            `Evening: Descend back to Chopta base by 03:30 PM. Warm evening bonfire under sparkling clear night skies with hearty dinner.`,
            `Stay: Swiss Alpine Camps in Chopta.`
          ]
        },
        {
          title: "Pristine Deoria Tal Lake Trek & Omkareshwar Ukhimath",
          points: [
            `Morning: Drive to Sari village base. Begin 2.5 km gentle scenic trek through dense oak forests to the crystal-clear Deoria Tal (7,998 ft).`,
            `Afternoon: Witness the stunning mirror reflection of snow-capped Chaukhamba peaks in the lake waters. Leisure walk and packed lunch by the lake.`,
            `Evening: Descend to Sari village. Visit ancient Omkareshwar Temple in Ukhimath (winter abode of Lord Kedarnath).`,
            `Stay: Swiss Alpine Camps in Chopta or Riverside Resort in Rudraprayag.`
          ]
        },
        {
          title: `Scenic Downhill Return Journey via Rishikesh to ${toCity}`,
          points: [
            `Morning: Hearty breakfast, pack bags, and begin scenic downhill drive following the river valley.`,
            `Afternoon: Halt at Rishikesh for riverside lunch by the Ganges.`,
            `Evening: Smooth expressway drive back to ${toCity}. Drop-off with cherished Himalayan summit memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in Swiss Alpine Camps / Cottages with attached washrooms",
      "Daily Nutritious Breakfast & Dinner (MAP Plan)",
      "Experienced Himalayan Trek Guide for Tungnath & Chandrashila Summit",
      "Kedarnath Wildlife Sanctuary Forest Entry Permits",
      "Dedicated Private Cab for entire journey including tolls, parking & driver night charges"
    ],
    exclusions: [
      "Personal trekking poles, heavy winter jackets, and thermals",
      "Pony / mule charges on trek (if hired)",
      "En-route lunches and personal expenses"
    ],
    tips: [
      "Night temperatures in Chopta drop significantly; carry 3-layer warm clothing.",
      "Start the Chandrashila summit push early in the morning to catch clear views before midday clouds roll in."
    ]
  },

  harshil: {
    title: (days, origin, returnCity) =>
      origin
        ? `🍎 Hidden Paradise Harsil Valley & Gangotri ${days}D/${Math.max(1, days - 1)}N Tour (${origin} to ${returnCity || origin})`
        : `🍎 Hidden Paradise Harsil Valley & Gangotri ${days}D/${Math.max(1, days - 1)}N Himalayan Tour`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Rishikesh / Dehradun";
      const toCity = returnCity || origin || "Rishikesh / Dehradun";
      return [
        {
          title: `Scenic Mountain Drive from ${fromCity} to Harsil Valley via Tehri Dam & Uttarkashi`,
          points: [
            `Morning (06:00 AM): Early departure from ${fromCity}. Ascend through winding mountain roads with panoramic views of the Tehri Dam reservoir.`,
            `Afternoon: Halt at Uttarkashi along the Bhagirathi River for lunch and visit the sacred Vishwanath Temple. Continue driving past Bhatwari and Gangnani hot water sulphur springs.`,
            `Evening: Enter the enchanting Harsil Valley (7,860 ft). Check-in to your riverside wooden cottage surrounded by deodar forests. Sip hot Himalayan herbal tea by the crystal-clear Bhagirathi river.`,
            `Stay: Riverside Wooden Cottage / Deluxe Resort in Harsil.`
          ]
        },
        {
          title: "Harsil Village Heritage, Dharali Apple Orchards & Mukhba",
          points: [
            `Morning: Wake up to birds chirping and mist rolling off the river. Walk through traditional wooden Garhwali houses of Harsil village and visit Wilson Cottage (built by British adventurer 'Pahari Wilson' in 1864).`,
            `Afternoon: Short drive to Dharali village known for sprawling apple and kidney bean (Rajma) farms. Cross the wooden suspension bridge to Mukhba village — the winter seat of Goddess Ganga.`,
            `Evening: Riverside photography, relax by the babbling mountain streams, and warm bonfire under millions of stars.`,
            `Stay: Riverside Wooden Cottage / Deluxe Resort in Harsil.`
          ]
        },
        {
          title: "Historic Gartang Gali Cliff Walk & Sacred Gangotri Dham",
          points: [
            `Morning: Drive to Lanka / Nelong Valley checkpost. Embark on the thrilling 2.5 km walk along the 150-year-old Gartang Gali — a historic wooden cliff-hanging bridge cantilevered at 11,000 ft along vertical granite cliffs.`,
            `Afternoon: Continue 25 km drive to the holy Gangotri Dham (10,200 ft). Attend Darshan at the sacred 18th-century white granite temple and witness the roaring Surya Kund waterfall where Bhagirathi rushes through deep gorges.`,
            `Evening: Drive back to Harsil. Savor authentic Garhwali dinner featuring local red rice, Harsil Rajma, and apple chutney.`,
            `Stay: Riverside Wooden Cottage / Deluxe Resort in Harsil.`
          ]
        },
        {
          title: `Downhill Drive from Harsil Valley back to ${toCity}`,
          points: [
            `Morning: Leisurely breakfast with mountain views. Check-out and begin scenic downhill descent.`,
            `Afternoon: Scenic riverbank lunch stop. Continue through Chamba / Rishikesh.`,
            `Evening: Drop-off at ${toCity} with unforgettable memories of unexplored Uttarakhand!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in Deluxe Riverside Wooden Cottages / Valley Resorts in Harsil",
      "Daily Nutritious Breakfast & Dinner featuring authentic local Garhwali dishes",
      "Dedicated Private Mountain Vehicle (Innova / Bolero / Tempo) including all fuel & tolls",
      "Full excursions to Gangotri Dham, Gartang Gali, Dharali, and Mukhba",
      "Experienced local mountain driver and all border/forest entry permits"
    ],
    exclusions: [
      "Airfare or train tickets to the starting point",
      "Personal expenses, laundry, and porterage",
      "Gartang Gali entry fee (approx ₹150 per person) and camera fees"
    ],
    tips: [
      "Carry valid Govt Photo IDs (Aadhaar/Passport) as Inner Line checkposts operate near Gangotri.",
      "Carry warm woolens and windproof jackets as Harsil temperatures plunge quickly after sunset."
    ]
  },

  aadrai: {
    title: (days, origin, returnCity) =>
      origin
        ? `🌿 Raw Rainforest Aadrai Jungle Trek ${days}D/${Math.max(1, days - 1)}N (${origin} to ${returnCity || origin})`
        : `🌿 Raw Rainforest Aadrai Jungle Trek ${days}D/${Math.max(1, days - 1)}N Adventure`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Mumbai / Pune";
      const toCity = returnCity || origin || "Mumbai / Pune";
      return [
        {
          title: `Drive from ${fromCity} to Malshej Ghat & Base Village Khireshwar`,
          points: [
            `Morning: Early morning departure from ${fromCity}. Scenic drive ascending the Western Ghats through mist-clad Malshej Ghat.`,
            `Afternoon: Arrive at Khireshwar base village. Traditional Maharashtrian rural homestay check-in. Safety briefing and gear check.`,
            `Evening: Nature walk around Pimpalgaon Joga Dam backwaters. Sunset reflection over Harishchandragad cliff. Savor hot Pithla Bhakri and Thecha.`,
            `Stay: Traditional Rustic Homestay / Village Tented Camp in Khireshwar.`
          ]
        },
        {
          title: "The Ultimate Aadrai Jungle Trail & Kalu Waterfall Canyon",
          points: [
            `Morning (06:30 AM): Hearty village breakfast with Poha and piping hot tea. Enter the dense, untamed Aadrai rainforest trail led by local tribal guides.`,
            `Afternoon: Trek through ancient rock caves, cross gushing mountain streams, and navigate under deep green forest canopies. Reach the majestic Kalu Waterfall viewpoint (1,200 ft drop).`,
            `Evening: Return to base village by late afternoon. Hot herbal tea, dry clothes, and celebratory dinner.`,
            `Stay: Rustic Homestay in Khireshwar / Malshej Resort.`
          ]
        },
        {
          title: `Malshej Ghat Waterfalls & Return Drive to ${toCity}`,
          points: [
            `Morning: Hot breakfast. Visit Malshej Ghat viewpoints and seasonal gushing roadside waterfalls.`,
            `Afternoon: Begin return drive back to ${toCity}.`,
            `Evening: Drop-off at designated point with thrilling Sahyadri jungle memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Village Homestay / Tented Camp accommodations",
      "Traditional Maharashtrian meals (Breakfast, Packed Trek Lunch, Village Dinner)",
      "Certified local mountaineering trek leader and tribal forest guides",
      "Private vehicle transfers from origin to trek base and return",
      "Safety gear and guided stream crossing support"
    ],
    exclusions: [
      "Personal trekking gear (high-grip shoes, poncho, dry bags)",
      "Personal insurance and medical expenses",
      "Packaged drinking water or personal snacks"
    ],
    tips: [
      "Aadrai is an authentic raw jungle trail — wearing high-ankle trekking shoes with strong grip is mandatory.",
      "Carry waterproof dry bags for electronics due to stream crossings."
    ]
  },

  manali: {
    title: (days, origin, returnCity) =>
      origin
        ? `🏔️ Scenic Manali & Solang Valley ${days}D/${Math.max(1, days - 1)}N Holiday (${origin} to ${returnCity || origin})`
        : `🏔️ Scenic Manali & Solang Valley ${days}D/${Math.max(1, days - 1)}N Mountain Escape`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      return [
        {
          title: `Journey from ${fromCity} to Manali & Old Manali Walk`,
          points: [
            `Morning: Arrival in Manali via scenic mountain highway from ${fromCity}. Private transfer and check-in to your resort with apple orchard views.`,
            `Afternoon: Unpack and freshen up. Visit the historic 450-year-old wooden Hadimba Devi Temple surrounded by cedar deodar forests and Vashisht Hot Sulphur Springs.`,
            `Evening: Stroll along Mall Road and vibrant Old Manali cafes. Enjoy trout fish or wood-fired pizza and shopping for woolens and local honey.`,
            `Stay: Premium Mountain View Resort in Manali.`
          ]
        },
        {
          title: "Solang Valley Snow Adventure & Atal Tunnel",
          points: [
            `Morning: Hearty breakfast at resort. Drive through the scenic Solang Valley for thrilling adventure sports (Paragliding, Zorbing, Quad Biking, and Cable Car ropeway).`,
            `Afternoon: Continue driving through the world's longest high-altitude highway tunnel — Atal Tunnel (9.02 km) towards Sissu waterfall in Lahaul Valley.`,
            `Evening: Capture stunning snowy mountain panoramas and return to Manali resort for bonfire with light music.`,
            `Stay: Premium Mountain View Resort in Manali.`
          ]
        },
        {
          title: "Naggar Castle Heritage & Art Trail",
          points: [
            `Morning: Leisurely breakfast. Drive towards ancient Naggar Castle — a historic stone-wood castle offering breathtaking views of the Beas river valley.`,
            `Afternoon: Visit the Nicholas Roerich Art Gallery and Tripura Sundari Temple. Enjoy lunch with local Himachali Siddu at a riverside cafe.`,
            `Evening: Free time for souvenir shopping at Tibetan Monastery market or relaxing by the Beas River.`,
            `Stay: Premium Mountain View Resort in Manali.`
          ]
        },
        {
          title: "Kasol & Manikaran Hot Springs Excursion",
          points: [
            `Morning: Drive to scenic Parvati Valley. Stop at Kasol (Mini Israel of India) with pine forest river walks.`,
            `Afternoon: Visit holy Manikaran Sahib Gurudwara and dip in natural therapeutic hot water springs. Savor sacred Langar lunch.`,
            `Evening: Return to Manali for last night gala dinner.`,
            `Stay: Premium Mountain View Resort in Manali.`
          ]
        },
        {
          title: `Kullu River Rafting & Departure to ${toCity}`,
          points: [
            `Morning: Check-out after breakfast. Drive to Kullu for thrilling White Water Rafting in Beas River and visit famous Kullu Shawl weaving factories.`,
            `Afternoon: Comfortable return journey back to ${toCity} with cherished mountain memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in 3/4-Star Mountain View Resort",
      "Daily Buffet Breakfast & Dinner (MAP Meal Plan)",
      "Private AC Cab for all airport/bus stand transfers & full sightseeing",
      "Solang Valley & Atal Tunnel excursion permits",
      "Driver allowances, fuel, toll taxes, and green tax permits"
    ],
    exclusions: [
      "Airfare or Volvo bus tickets (unless specified)",
      "Personal adventure sports charges (paragliding, river rafting, skiing)",
      "Entry tickets to monuments and camera fees"
    ],
    tips: [
      "Carry heavy warm woolens during winter (Oct-March) and light jackets for summer evenings.",
      "Start early for Atal Tunnel and Solang Valley to avoid peak traffic."
    ]
  },

  kashmir: {
    title: (days, origin, returnCity) =>
      origin
        ? `🌺 Heaven on Earth Kashmir ${days}D/${Math.max(1, days - 1)}N Tour (${origin} to ${returnCity || origin})`
        : `🌺 Heaven on Earth Kashmir ${days}D/${Math.max(1, days - 1)}N Tour Itinerary`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Srinagar";
      const toCity = returnCity || origin || "Srinagar";
      return [
        {
          title: `Arrival in Srinagar from ${fromCity} & Dal Lake Houseboat Experience`,
          points: [
            `Morning: Pick-up from Srinagar Airport (SXR) or transfer from ${fromCity}. Traditional warm welcome with hot Kashmiri Kahwa tea.`,
            `Afternoon: Check-in to luxury traditional carved Wooden Houseboat. Enjoy an authentic 1-Hour Shikara Ride across Dal Lake, floating vegetable gardens, and Nehru Park.`,
            `Evening: Sunset photography over Char Chinar and shopping at Meena Bazaar floating market.`,
            `Stay: Premium Heritage Houseboat on Dal Lake / Nigeen Lake.`
          ]
        },
        {
          title: "Gulmarg Gondola & Meadow of Flowers",
          points: [
            `Morning: Scenic drive to Gulmarg (8,825 ft) passing willow trees and saffron fields. View snow-capped Apharwat peaks.`,
            `Afternoon: Experience the world's highest cable car — Gulmarg Gondola Ride (Phase 1 Kungdoor & Phase 2 Apharwat Peak at 13,780 ft). Enjoy snow sledge riding and skiing.`,
            `Evening: Visit historic St. Mary's Church and Golf Course. Return to Srinagar hotel for dinner.`,
            `Stay: Deluxe Hotel in Srinagar.`
          ]
        },
        {
          title: "Pahalgam Valley of Shepherds & Betaab Valley",
          points: [
            `Morning: Drive to Pahalgam via historic Avantipur Ruins and Pampore Saffron fields. Stop at Apple orchards.`,
            `Afternoon: Reach Pahalgam on the banks of Lidder River. Explore Betaab Valley, Aru Valley & Chandanwari.`,
            `Evening: Riverside relaxation, photography and trout fishing by Lidder stream.`,
            `Stay: Riverside Resort in Pahalgam.`
          ]
        },
        {
          title: "Srinagar Mughal Gardens & Old City Heritage",
          points: [
            `Morning: Drive back to Srinagar. Explore UNESCO-recognized Mughal Gardens: Shalimar Bagh, Nishat Bagh and Cheshma Shahi.`,
            `Afternoon: Visit sacred Shankaracharya Temple perched atop hill for 360-degree aerial views of Srinagar city and Dal Lake.`,
            `Evening: Stroll through Lal Chowk and Old Srinagar for Kashmiri dry fruits, walnut woodwork, and genuine Pashmina shawls.`,
            `Stay: Deluxe Hotel in Srinagar.`
          ]
        },
        {
          title: `Souvenir Shopping & Departure to ${toCity}`,
          points: [
            `Morning: Relish hot breakfast. Last-minute shopping for Kashmiri saffron, walnuts, and papier-mâché handicrafts.`,
            `Afternoon: Private drop at Srinagar Airport or return transfer to ${toCity} with unforgettable memories of Kashmir paradise!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "1 Night accommodation in Luxury Dal Lake Houseboat",
      "Remaining nights in 3/4-Star Deluxe Hotels in Srinagar & Pahalgam",
      "Daily Breakfast and Dinner (Veg/Non-Veg Kashmiri & North Indian)",
      "1-Hour complimentary Shikara Ride on Dal Lake",
      "Dedicated Private AC Sedan / SUV for transfers and all sightseeing",
      "Driver night charges, toll taxes, parking, and state border permits"
    ],
    exclusions: [
      "Flight tickets to/from Srinagar",
      "Gulmarg Gondola cable car Phase 1 & 2 tickets (must pre-book online)",
      "Union cab charges for Aru/Betaab Valley in Pahalgam and pony rides",
      "Personal expenses, camera charges, and tips"
    ],
    tips: [
      "Always book Gulmarg Gondola Phase 2 tickets in advance on the official JKTDC website.",
      "Postpaid SIM cards (Jio/Airtel/BSNL) work in Jammu & Kashmir; prepaid outside SIMs do not work."
    ]
  },

  jaipur: {
    title: (days, origin, returnCity) =>
      origin
        ? `🏰 Royal Jaipur Pink City ${days}D/${Math.max(1, days - 1)}N Tour (${origin} to ${returnCity || origin})`
        : `🏰 Royal Jaipur Pink City ${days}D/${Math.max(1, days - 1)}N Heritage Tour`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Delhi";
      const toCity = returnCity || origin || "Delhi";
      return [
        {
          title: `Drive from ${fromCity} to Jaipur & Chokhi Dhani Cultural Evening`,
          points: [
            `Morning: Departure from ${fromCity} via Delhi-Mumbai Expressway (approx. 260 km / 4.5 hrs). Arrive in the Pink City, Jaipur.`,
            `Afternoon: Check-in to your royal heritage hotel. Relax and visit the magnificent white-marble Birla Mandir.`,
            `Evening: Visit Chokhi Dhani traditional ethnic village for live Rajasthani folk dance, puppet shows, camel rides, and authentic Dal Baati Churma feast.`,
            `Stay: Heritage Hotel in Jaipur.`
          ]
        },
        {
          title: "Amer Fort, Hawa Mahal, City Palace & Nahargarh Sunset",
          points: [
            `Morning: Ascend to grand Amer Fort (Amber Palace) by jeep/elephant. Tour the glittering Sheesh Mahal (Mirror Palace) and royal courtyards. Stop at Jal Mahal for photos.`,
            `Afternoon: Visit Hawa Mahal (Palace of Winds), the City Palace museum, and UNESCO Jantar Mantar astronomical observatory.`,
            `Evening: Head up to Nahargarh Fort atop the Aravalli hills for a spectacular golden sunset overlooking the illuminated Pink City.`,
            `Stay: Heritage Hotel in Jaipur.`
          ]
        },
        {
          title: `Albert Hall, Bazaars Shopping & Return Drive to ${toCity}`,
          points: [
            `Morning: Hearty Rajasthani breakfast. Visit Albert Hall Museum (Central Museum) and Patrika Gate.`,
            `Afternoon: Shopping in Johari Bazaar and Bapu Bazaar for Jaipur blue pottery, bandhani dupattas, and lac bangles.`,
            `Evening: Comfortable return drive back to ${toCity}. Drop-off with royal Rajputana memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodations in Royal Heritage Hotel with daily breakfast",
      "Private AC Sedan/SUV for all transfers and city sightseeing",
      "Chokhi Dhani cultural village entry & traditional dinner",
      "All toll taxes, parking fees, and driver allowances"
    ],
    exclusions: [
      "Monument entry tickets and camera fees",
      "Elephant / Jeep ride charges at Amer Fort",
      "Personal shopping and lunch meals"
    ],
    tips: [
      "Pre-book composite monument tickets for hassle-free entry across all Jaipur forts.",
      "Savor local Pyaaz Kachori at Rawat Mishtan Bhandar."
    ]
  },

  goa: {
    title: (days, origin, returnCity) =>
      origin
        ? `🏖️ Sun, Sand & Sea Goa ${days}D/${Math.max(1, days - 1)}N Holiday (${origin} to ${returnCity || origin})`
        : `🏖️ Sun, Sand & Sea Goa ${days}D/${Math.max(1, days - 1)}N Beach Holiday`,
    days: (days, origin, returnCity) => {
      const fromCity = origin || "Mumbai / Bangalore";
      const toCity = returnCity || origin || "Mumbai / Bangalore";
      return [
        {
          title: `Arrival in Goa from ${fromCity} & Sunset Beach Chill`,
          points: [
            `Morning: Pick-up from Goa Airport (GOI/GOX) or transfer from ${fromCity}. Private transfer to your coastal resort.`,
            `Afternoon: Check-in, refresh by swimming pool. Stroll around Calangute or Candolim beach.`,
            `Evening: Sunset cocktail at a beach shack with acoustic music. Enjoy the lively Goan evening vibe.`,
            `Stay: Beachside Resort in North Goa.`
          ]
        },
        {
          title: "North Goa Forts, Water Sports & Baga Nightlife",
          points: [
            `Morning: Visit 17th-century Fort Aguada and Light House with panoramic Arabian Sea views. Stop at Chapora Fort ('Dil Chahta Hai' fort).`,
            `Afternoon: Head to Anjuna and Baga beach. Enjoy watersports: Parasailing, Jet Ski, Banana Boat ride, and Bumper ride.`,
            `Evening: Experience buzzing nightlife at iconic Tito's Lane or open-air seaside club.`,
            `Stay: Beachside Resort in North Goa.`
          ]
        },
        {
          title: "South Goa Heritage, Spice Plantation & Mandovi River Cruise",
          points: [
            `Morning: Visit Old Goa UNESCO World Heritage Churches: Basilica of Bom Jesus and Se Cathedral.`,
            `Afternoon: Tour a tropical Spice Plantation with traditional Goan buffet lunch served on banana leaf.`,
            `Evening: 1-Hour Mandovi River Sunset Cruise featuring live Goan folk dance and DJ music.`,
            `Stay: Beachside Resort in North Goa.`
          ]
        },
        {
          title: `Dudhsagar Waterfalls or Beach Relaxation & Return to ${toCity}`,
          points: [
            `Morning: Jeep safari to Dudhsagar Waterfalls or leisurely walk through Latin Quarter (Fontainhas).`,
            `Afternoon: Check-out and private transfer for return journey to ${toCity} with sun-kissed memories!`
          ]
        }
      ].slice(0, days);
    },
    inclusions: [
      "Accommodation in Beachside Resort with Swimming Pool",
      "Daily Buffet Breakfast at Resort",
      "Private AC Vehicle for all transfers and sightseeing tours",
      "1-Hour Mandovi River Sunset Cruise tickets",
      "All driver allowances, parking, fuel, and toll charges"
    ],
    exclusions: [
      "Airfare or Train tickets",
      "Water sports charges & Dudhsagar jeep safari tickets",
      "Lunches and beverages outside hotel plan"
    ],
    tips: [
      "Wear comfortable cotton clothes and high SPF sunscreen.",
      "Try authentic Goan fish curry thali at authentic local shacks."
    ]
  },

  dubai: {
    title: (days) => `🌆 Dubai Extravaganza ${days}D/${Math.max(1, days - 1)}N Luxury Tour`,
    days: [
      {
        title: "Arrival in Dubai & Marina Dhow Cruise with Dinner",
        points: [
          "Morning: Arrival at Dubai International Airport (DXB). Warm welcome and private luxury transfer to your hotel.",
          "Afternoon: Check-in, relax and refresh. Explore nearby city walks and malls.",
          "Evening: 07:00 PM pickup for the stunning Dubai Marina Dhow Cruise with 5-star international buffet dinner, live Tanoura dance show, and skyline views.",
          "Stay: 4-Star Hotel in Downtown / Bur Dubai."
        ]
      },
      {
        title: "Half-Day City Tour & Burj Khalifa (124th Floor)",
        points: [
          "Morning: Guided panoramic city tour covering Dubai Museum, Jumeirah Beach, Burj Al Arab photo stop, and Atlantis The Palm.",
          "Afternoon: Visit the world's largest Dubai Mall. Watch the giant indoor aquarium tunnel.",
          "Evening: Enter Burj Khalifa at the 124th & 125th Floor Observation Deck for sunset views, followed by the spectacular Dubai Fountain musical show.",
          "Stay: 4-Star Hotel in Dubai."
        ]
      },
      {
        title: "Thrilling Desert Safari with BBQ Dinner & Shows",
        points: [
          "Morning: Relaxed morning breakfast. Free time for Gold Souk and Meena Bazaar shopping.",
          "Afternoon (03:00 PM): 4x4 Land Cruiser pickup for Red Dunes Desert Safari. Experience dune bashing, sandboarding, and sunset photos.",
          "Evening: Reach Bedouin desert camp. Enjoy camel rides, henna painting, unlimited BBQ buffet dinner, Belly Dance, and Fire show.",
          "Stay: 4-Star Hotel in Dubai."
        ]
      },
      {
        title: "Miracle Garden & Global Village Extravaganza",
        points: [
          "Morning: Visit Dubai Miracle Garden — the world's largest natural flower garden with 150 million blooming flowers.",
          "Afternoon: Visit Global Village featuring cultural pavilions, street food, and performances from 90+ countries.",
          "Evening: View the illuminated Dubai Frame spanning old and modern Dubai views.",
          "Stay: 4-Star Hotel in Dubai."
        ]
      },
      {
        title: "Duty-Free Shopping & Airport Departure",
        points: [
          "Morning: Lavish hotel breakfast. Last-minute luxury shopping at Deira City Centre or Mall of the Emirates.",
          "Afternoon: Private hotel checkout and transfer to Dubai Airport with unforgettable memories!"
        ]
      }
    ],
    inclusions: [
      "Daily Buffet Breakfast at Hotel",
      "Return Dubai Airport (DXB) Private Transfers",
      "Desert Safari in 4x4 Land Cruiser with BBQ Dinner, Dune Bashing & Shows",
      "Burj Khalifa 124th/125th Floor Non-Prime tickets + Dubai Aquarium",
      "Dubai Marina Dhow Cruise with 5-Star Buffet Dinner",
      "Half-day Dubai Guided City Tour on sharing/private basis",
      "All UAE VAT and Tourism Dirham taxes included"
    ],
    exclusions: [
      "International Flights tickets",
      "UAE Tourist Visa and travel insurance",
      "Personal expenses, tips, and optional activities"
    ],
    tips: [
      "Keep modest dress codes in mind when visiting mosques and public heritage spots.",
      "Pre-book Burj Khalifa sunset slots as tickets sell out quickly."
    ]
  },

  bali: {
    title: (days) => `🌺 Tropical Paradise Bali ${days}D/${Math.max(1, days - 1)}N Holiday Itinerary`,
    days: [
      {
        title: "Arrival in Bali & Romantic Jimbaran Sunset Seafood",
        points: [
          "Morning: Arrival at Ngurah Rai International Airport (DPS) in Denpasar. Traditional Balinese flower garland welcome & private transfer to resort.",
          "Afternoon: Check-in and unwind. Relax by the infinity pool.",
          "Evening: Head to Jimbaran Bay for candlelit seafood dinner right on the beach during golden hour.",
          "Stay: Luxury Pool Villa / Resort in Kuta / Seminyak / Ubud."
        ]
      },
      {
        title: "Ubud Culture, Tegalalang Rice Terrace & Bali Swing",
        points: [
          "Morning: Scenic drive to cultural heart Ubud. Visit the sacred Ubud Monkey Forest Sanctuary.",
          "Afternoon: Walk along emerald Tegalalang Rice Terraces and soar on the famous jungle Bali Swing.",
          "Evening: Tour Ubud Royal Palace and art market for woven rattan bags and silver jewelry.",
          "Stay: Private Pool Villa in Ubud."
        ]
      },
      {
        title: "Kintamani Volcano, Coffee Plantation & Tirta Empul",
        points: [
          "Morning: Drive to Kintamani viewpoint overlooking active Mount Batur volcano and crescent Lake Batur.",
          "Afternoon: Taste world's rarest Luwak coffee at a spice plantation. Experience holy water purification at Tirta Empul Water Temple.",
          "Evening: Dinner overlooking Campuhan Ridge.",
          "Stay: Luxury Pool Villa in Ubud / Seminyak."
        ]
      },
      {
        title: "Nusa Penida Island Excursion (Kelingking Beach & Broken Beach)",
        points: [
          "Morning (06:30 AM): Speedboat transfer from Sanur harbour to exotic Nusa Penida island.",
          "Afternoon: Marvel at famous T-Rex shaped Kelingking Beach cliff, Broken Beach, and natural infinity pool Angel's Billabong.",
          "Evening: Return speedboat to main island Bali.",
          "Stay: Beach Resort in Seminyak / Nusa Dua."
        ]
      },
      {
        title: "Tanah Lot Temple & Airport Departure",
        points: [
          "Morning: Visit the iconic sea-facing Tanah Lot Temple perched on an offshore rock formation.",
          "Afternoon: Check-out from villa and private transfer to Denpasar Airport with sun-kissed memories!"
        ]
      }
    ],
    inclusions: [
      "Private Pool Villa / 4-5 Star Luxury Resort stay",
      "Daily Floating / Buffet Breakfast at Resort",
      "Private AC Car with English-speaking Balinese driver for all tours",
      "Nusa Penida West Island tour with return speed boat tickets",
      "Bali Swing and Kintamani volcano tour entry tickets"
    ],
    exclusions: [
      "International flights to Bali",
      "Indonesia Visa On Arrival (approx USD 35) & Bali tourist levy",
      "Watersports at Tanjung Benoa and personal gratuities"
    ],
    tips: [
      "Wear temple-appropriate clothing (Sarong provided at temple gates).",
      "Keep cash (Indonesian Rupiah) for local markets and beach cafes."
    ]
  }
};

// Aliases for Mussoorie variations
DESTINATION_TEMPLATES.mussorie = DESTINATION_TEMPLATES.mussoorie;
DESTINATION_TEMPLATES.mussoori = DESTINATION_TEMPLATES.mussoorie;
DESTINATION_TEMPLATES.mansoori = DESTINATION_TEMPLATES.mussoorie;
DESTINATION_TEMPLATES.harsil = DESTINATION_TEMPLATES.harshil;

// ==========================================
// 4. PROCEDURAL INDIAN SYNTHESIS ENGINE
// ==========================================
function synthesizeCustomDestination(destination, days, tripStyle, origin = "", returnCity = "", commandText = "", specs = {}) {
  const destClean = destination.trim();
  const startLocation = origin ? origin : "your departure city";
  const endLocation = returnCity ? returnCity : (origin ? origin : startLocation);

  // 1. Check if real-world data exists in the 60+ Indian registry
  const realData = getIndianDestinationRealData(destClean, commandText);

  if (realData) {
    const dayCards = [];
    for (let i = 1; i <= days; i++) {
      if (i === 1) {
        dayCards.push({
          dayNumber: 1,
          title: `Scenic Drive / Journey from ${startLocation} to ${realData.name} & Evening Orientation`,
          points: [
            `Morning: Early departure from ${startLocation} by private vehicle. ${realData.route ? realData.route + "." : "Travel along scenic national highway with breakfast stop."}`,
            `Afternoon: Arrive in ${realData.name}. Check-in to ${realData.stay}. Unpack, freshen up, and enjoy hot local tea with mountain/valley views.`,
            `Evening: Visit ${realData.spots[0]} for sunset views. Savor dinner featuring ${realData.food[0] || "authentic local cuisine"}.`,
            `Stay: ${realData.stay}.`
          ]
        });
      } else if (i === days) {
        dayCards.push({
          dayNumber: i,
          title: `Morning Sightseeing & Return Journey to ${endLocation}`,
          points: [
            `Morning: Enjoy hearty breakfast with scenic vistas. Visit ${realData.spots[1] || "local scenic viewpoints"} and shop for local souvenirs and ${realData.activities[0] || "specialties"}.`,
            `Afternoon: Check-out from resort and commence comfortable return journey back to ${endLocation}.`,
            `Evening: Drop-off at ${endLocation} with unforgettable memories of ${realData.name}!`
          ]
        });
      } else {
        const spot1 = realData.spots[(i - 1) * 2] || realData.spots[2] || realData.spots[0];
        const spot2 = realData.spots[(i - 1) * 2 + 1] || realData.spots[3] || realData.spots[1];
        const act = realData.activities[i - 2] || realData.activities[0] || "local nature exploration";
        const dish = realData.food[1] || realData.food[0] || "regional specialties";

        dayCards.push({
          dayNumber: i,
          title: `${realData.name} Exploration: ${spot1}`,
          points: [
            `Morning: Breakfast at stay. Visit ${spot1}. Experience ${act}.`,
            `Afternoon: Guided visit to ${spot2}. Relish lunch with ${dish}.`,
            `Evening: Sunset walk, leisure cafe time, and peaceful dinner under starlit skies.`,
            `Stay: ${realData.stay}.`
          ]
        });
      }
    }

    return {
      title: origin
        ? `✨ ${realData.name} ${days}D/${Math.max(1, days - 1)}N Tour (${startLocation} to ${endLocation})`
        : `✨ ${realData.name} ${days}D/${Math.max(1, days - 1)}N Holiday Package`,
      days: dayCards,
      inclusions: [
        `Accommodations in ${realData.stay}`,
        `Daily Nutritious Breakfast & Dinner (MAP Plan)`,
        `Private AC Vehicle for all transfers from ${startLocation} and sightseeing`,
        `Experienced local driver, all tolls, parking, and state permits`
      ],
      exclusions: [
        "Transport / Airfare to the starting point (unless specified)",
        "Personal expenses, shopping, and laundry",
        "Monument entry tickets and adventure activity fees"
      ],
      tips: [
        `Carry comfortable walking shoes and valid ID proofs throughout the ${realData.name} trip.`,
        `Check seasonal weather guidelines before packing clothes for ${realData.state}.`
      ]
    };
  }

  // 2. Terrain-aware fallback for any other place
  const isMountainOrValley = /valley|trek|hill|ghat|peak|lake|pass|kund|giri|tal|pahad|himalay|uttarakhand|himachal|kashmir|ladakh|sikkim|fort|gad|bugyal|cliff|plateau|canyon|falls|waterfall|forest|sanctuary/i.test(destClean);
  const isBeachOrCoastal = /beach|island|coast|sea|ocean|port|bay|cove|lagoon|reef|goa|gokarna|andaman/i.test(destClean);
  const dayCards = [];

  for (let i = 1; i <= days; i++) {
    const isFirstDay = i === 1;
    const isLastDay = i === days;

    if (isMountainOrValley) {
      if (isFirstDay) {
        dayCards.push({
          dayNumber: 1,
          title: `Scenic Mountain Drive from ${startLocation} to ${destClean}`,
          points: [
            `Morning (06:00 AM): Early departure from ${startLocation} by private vehicle. Begin scenic ascent along winding river valleys and pine-covered mountain roads.`,
            `Afternoon: Halt for lunch at a riverside roadside eatery. Continue ascending through scenic mountain passes and forest checkposts.`,
            `Evening: Reach ${destClean}. Check-in to your valley resort / cozy wooden mountain cottage. Take an evening walk through the local settlement and enjoy sunset.`,
            `Stay: Mountain View Resort / Cottage in ${destClean}.`
          ]
        });
      } else if (isLastDay) {
        dayCards.push({
          dayNumber: i,
          title: `Morning Mountain Sunrise & Return Drive to ${endLocation}`,
          points: [
            `Morning: Wake up to crisp mountain air and golden sunrise. Enjoy hot breakfast with mountain herbal tea.`,
            `Afternoon: Check-out and begin scenic downhill return drive, taking brief tea and photo stops.`,
            `Evening: Drop-off at ${endLocation} with unforgettable memories of ${destClean}!`
          ]
        });
      } else {
        dayCards.push({
          dayNumber: i,
          title: `${destClean} Valley Exploration, Local Sights & Nature Trails`,
          points: [
            `Morning: Hearty breakfast with panoramic views. Visit top scenic viewpoints, local ancient shrines, and natural cascading streams.`,
            `Afternoon: Gentle nature walk or hike through pine and deodar forests. Enjoy traditional local Himalayan dishes for lunch.`,
            `Evening: Sunset photography from a high-altitude ridge. Return to resort for cozy evening bonfire.`,
            `Stay: Mountain View Resort / Cottage in ${destClean}.`
          ]
        });
      }
    } else if (isBeachOrCoastal) {
      if (isFirstDay) {
        dayCards.push({
          dayNumber: 1,
          title: `Arrival in ${destClean} from ${startLocation} & Sunset Beach Relaxation`,
          points: [
            `Morning: Journey from ${startLocation} to ${destClean}. Private transfer to your coastal resort.`,
            `Afternoon: Check-in, relax, and freshen up. Enjoy a dip in the resort pool or take a stroll along the shoreline.`,
            `Evening: Golden hour sunset walk along the sandy beach. Savor fresh coastal delicacies and dinner at a seaside shack.`,
            `Stay: Coastal Beach Resort in ${destClean}.`
          ]
        });
      } else if (isLastDay) {
        dayCards.push({
          dayNumber: i,
          title: `Coastal Souvenirs & Return Journey to ${endLocation}`,
          points: [
            `Morning: Breakfast by the sea. Quick souvenir shopping for local handicrafts and spices.`,
            `Afternoon: Check-out and private transfer for return journey to ${endLocation} with sun-kissed memories of ${destClean}!`
          ]
        });
      } else {
        dayCards.push({
          dayNumber: i,
          title: `${destClean} Coastal Sights, Watersports & Island Excursion`,
          points: [
            `Morning: Visit iconic coastal viewpoints, historic forts/lighthouses, or embark on a morning boat cruise.`,
            `Afternoon: Experience thrilling watersports or relax in hammock cafes with refreshing tropical drinks.`,
            `Evening: Sunset cruise or seaside dinner with live acoustic music.`,
            `Stay: Coastal Beach Resort in ${destClean}.`
          ]
        });
      }
    } else {
      if (isFirstDay) {
        dayCards.push({
          dayNumber: 1,
          title: `Journey from ${startLocation} to ${destClean} & City Orientation`,
          points: [
            `Morning: Arrival in ${destClean} from ${startLocation}. Warm welcome and private transfer to your hotel.`,
            `Afternoon: Check-in, unpack, and relax. Stroll around the central avenue and neighborhood market.`,
            `Evening: Visit prominent local landmark or heritage promenade. Welcome dinner at a celebrated local restaurant.`,
            `Stay: Premium Hotel in ${destClean}.`
          ]
        });
      } else if (isLastDay) {
        dayCards.push({
          dayNumber: i,
          title: `Local Bazaars & Return Journey to ${endLocation}`,
          points: [
            `Morning: Hearty breakfast. Free time for souvenir shopping in the traditional bazaars.`,
            `Afternoon: Check-out and return transfer to ${endLocation} with sweet memories!`
          ]
        });
      } else {
        dayCards.push({
          dayNumber: i,
          title: `${destClean} Iconic Landmarks & Cultural Heritage`,
          points: [
            `Morning: Guided tour of ${destClean}'s top historic monuments, palaces, or museums.`,
            `Afternoon: Savor authentic regional cuisine and explore local artisan craft centers.`,
            `Evening: Scenic viewpoint sunset observation followed by lively night market exploration.`,
            `Stay: Premium Hotel in ${destClean}.`
          ]
        });
      }
    }
  }

  return {
    title: isMountainOrValley
      ? `🏔️ ${destClean} ${days}D/${Math.max(1, days - 1)}N Mountain Valley Tour`
      : isBeachOrCoastal
      ? `🏖️ ${destClean} ${days}D/${Math.max(1, days - 1)}N Coastal Holiday`
      : `${destClean} ${days}D/${Math.max(1, days - 1)}N ${tripStyle || "Tour Package"}`,
    days: dayCards,
    inclusions: isMountainOrValley
      ? [
          `Accommodations in Mountain View Resort / Cottage in ${destClean}`,
          `Daily Breakfast & Dinner (MAP Plan with nutritious local meals)`,
          `Dedicated Private AC/Heating Vehicle for mountain roads including fuel`,
          `All mountain road permits, green cess, toll taxes, and driver night allowances`
        ]
      : [
          `Accommodations in 3/4-Star Hotels / Resort with daily breakfast`,
          `Private AC vehicle for all transfers and city sightseeing in ${destClean}`,
          `Experienced local driver & tour coordinator`,
          `All toll taxes, parking charges, fuel, and driver allowances`
        ],
    exclusions: [
      `Transport / Airfare to the starting point`,
      `Personal expenses, tips, porterage, and laundry services`,
      `Monument entry tickets and optional adventure activities`
    ],
    tips: isMountainOrValley
      ? [
          `Mountain roads require careful driving; journey during daylight hours is strongly advised.`,
          `Carry layered warm clothing and thermals as high-altitude valleys turn cold after sunset.`
        ]
      : [
          `Keep local currency and payment apps ready for convenient shopping in ${destClean}.`,
          `Carry appropriate clothing and comfortable walking footwear for sightseeing tours.`
        ]
  };
}

// ==========================================
// 5. USER ROUGH NOTES PARSER
// ==========================================
export function parseUserRoughNotes(text, defaultDays = 4, destinationName = "Your Destination") {
  if (!text || !text.trim()) return null;

  const lines = text.split(/\r?\n|\\n/).map(l => l.trim()).filter(Boolean);
  const detectedDays = [];
  const detectedInclusions = [];
  const detectedExclusions = [];
  let currentDay = null;

  const dayPattern = /^(?:day\s*(\d+)|d(\d+)|(\d+)st\s*day|(\d+)nd\s*day|(\d+)rd\s*day|(\d+)th\s*day)[\s:.-]*(.*)/i;
  const inclusionHeaderPattern = /(?:inclusion|included|inclusions|package includes|included rahega|ye include)/i;
  const exclusionHeaderPattern = /(?:exclusion|excluded|exclusions|package excludes|not included|exclude)/i;

  let currentSection = "days";

  for (let line of lines) {
    if (inclusionHeaderPattern.test(line)) {
      currentSection = "inclusions";
      const parts = line.split(/[:-]/);
      if (parts.length > 1 && parts[1].trim()) {
        parts[1].split(/[,;]/).forEach(item => {
          if (item.trim()) detectedInclusions.push(item.trim());
        });
      }
      continue;
    }

    if (exclusionHeaderPattern.test(line)) {
      currentSection = "exclusions";
      const parts = line.split(/[:\\-]/);
      if (parts.length > 1 && parts[1].trim()) {
        parts[1].split(/[,;]/).forEach(item => {
          if (item.trim()) detectedExclusions.push(item.trim());
        });
      }
      continue;
    }

    if (currentSection === "inclusions") {
      const cleaned = line.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleaned) {
        cleaned.split(/[,;]/).forEach(item => {
          if (item.trim()) detectedInclusions.push(item.trim());
        });
      }
      continue;
    }

    if (currentSection === "exclusions") {
      const cleaned = line.replace(/^[-*•\d.]+\s*/, "").trim();
      if (cleaned) {
        cleaned.split(/[,;]/).forEach(item => {
          if (item.trim()) detectedExclusions.push(item.trim());
        });
      }
      continue;
    }

    const dayMatch = line.match(dayPattern);
    if (dayMatch) {
      if (currentDay) detectedDays.push(currentDay);
      const dayNum = dayMatch[1] || dayMatch[2] || dayMatch[3] || dayMatch[4] || dayMatch[5] || (detectedDays.length + 1);
      const dayText = dayMatch[6] || "";
      currentDay = {
        dayNumber: Number(dayNum),
        title: dayText.trim() || `Day ${dayNum} Exploration`,
        points: dayText.trim() ? [dayText.trim()] : []
      };
    } else if (currentDay) {
      const cleanPoint = line.replace(/^[-*•]\s*/, "").trim();
      if (cleanPoint) currentDay.points.push(cleanPoint);
    } else {
      if (/meal|breakfast|dinner|stay|hotel|transport|cab|sightseeing/i.test(line)) {
        if (/not included|excluded/i.test(line)) {
          detectedExclusions.push(line.replace(/^[-*•]\s*/, "").trim());
        } else if (/included|include/i.test(line)) {
          detectedInclusions.push(line.replace(/^[-*•]\s*/, "").trim());
        }
      }
    }
  }

  if (currentDay) detectedDays.push(currentDay);

  return {
    hasRoughNotes: detectedDays.length > 0 || detectedInclusions.length > 0,
    days: detectedDays,
    inclusions: detectedInclusions,
    exclusions: detectedExclusions
  };
}

// ==========================================
// 6. MAIN BUILDER FUNCTION
// ==========================================
export function buildSmartItinerary({
  destination,
  days = 4,
  tripType = "Family Vacation",
  agencyName = "",
  phone = "",
  email = "",
  roughNotes = ""
}) {
  const rawDest = (destination || "").trim();
  const commandText = (roughNotes || "").trim();

  const specs = extractTravelSpecs(commandText, rawDest);
  const { origin, returnCity, vehicle } = specs;

  // 2. Extract duration if mentioned in command
  let numDays = Math.max(1, Number(days) || 4);
  const durMatch = commandText.match(/(\d+)\s*n\s*(\d+)\s*d/i);
  const durMatch2 = commandText.match(/(\d+)\s*d\s*(\d+)\s*n/i);
  const durMatch3 = commandText.match(/(\d+)\s*(?:days?|din)/i);
  if (durMatch) {
    numDays = Number(durMatch[2]);
  } else if (durMatch2) {
    numDays = Number(durMatch2[1]);
  } else if (durMatch3 && (!days || days === 4 || days === 5)) {
    numDays = Number(durMatch3[1]);
  }

  // 3. Resolve destination key & canonical name
  const resolved = resolveDestination(rawDest, commandText);
  const effectiveDest = resolved.canonical || (rawDest && rawDest.toLowerCase() !== "destination" ? rawDest : "Custom Tour");

  // 4. Check if user provided rough notes with day-wise lines
  const roughParsed = parseUserRoughNotes(commandText, numDays, effectiveDest);

  // 5. Find preset template or synthesize
  let baseTemplate = null;
  if (resolved.key && DESTINATION_TEMPLATES[resolved.key]) {
    baseTemplate = DESTINATION_TEMPLATES[resolved.key];
  } else {
    baseTemplate = synthesizeCustomDestination(effectiveDest, numDays, tripType, origin, returnCity, commandText, specs);
  }

  // 6. Build the day-wise itinerary
  const finalDays = [];

  if (roughParsed && roughParsed.days && roughParsed.days.length > 0) {
    roughParsed.days.forEach((rd, idx) => {
      const dayNum = idx + 1;
      let title = rd.title || `Day ${dayNum}: Sightseeing & Activities`;
      if (!title.toLowerCase().startsWith("day")) {
        title = `Day ${dayNum}: ${title}`;
      }

      let points = [];
      if (rd.points && rd.points.length > 0) {
        rd.points.forEach(p => {
          if (/^(morning|afternoon|evening|night|stay):/i.test(p)) {
            points.push(p);
          } else if (/stay|hotel|resort|night stay/i.test(p)) {
            points.push(`Stay & Relax: ${p}`);
          } else {
            points.push(`Activity: ${p}`);
          }
        });
      }

      const hasStay = points.some(p => /stay/i.test(p));
      if (!hasStay && dayNum < numDays) {
        points.push(`Stay: Comfortable Hotel / Resort in ${effectiveDest}.`);
      }

      finalDays.push({
        dayNumber: dayNum,
        title,
        points: points.length > 0 ? points : [`Explore top attractions and local sights in ${effectiveDest}.`]
      });
    });

    if (finalDays.length < numDays) {
      for (let i = finalDays.length + 1; i <= numDays; i++) {
        const isLastDay = i === numDays;
        if (isLastDay) {
          finalDays.push({
            dayNumber: i,
            title: `Day ${i}: Souvenir Shopping & Departure to ${returnCity || origin || "Home"}`,
            points: [
              `Morning: Delicious breakfast at hotel. Check-out and last-minute local shopping.`,
              `Afternoon: Private transfer for return journey to ${returnCity || origin || "home"} with unforgettable memories of ${effectiveDest}!`
            ]
          });
        } else {
          finalDays.push({
            dayNumber: i,
            title: `Day ${i}: ${effectiveDest} Exploration & Leisure`,
            points: [
              `Morning: Hearty breakfast. Visit local scenic viewpoints and cultural highlights.`,
              `Afternoon: Leisure time for street shopping and trying famous local cuisine.`,
              `Evening: Sunset walk and dinner at a top-rated restaurant.`,
              `Stay: Comfortable Hotel / Resort in ${effectiveDest}.`
            ]
          });
        }
      }
    }
  } else {
    const templateDays = typeof baseTemplate.days === "function"
      ? baseTemplate.days(numDays, origin, returnCity, specs)
      : baseTemplate.days;

    for (let i = 1; i <= numDays; i++) {
      if (templateDays && templateDays[i - 1]) {
        finalDays.push({
          dayNumber: i,
          title: templateDays[i - 1].title.startsWith("Day") ? templateDays[i - 1].title : `Day ${i}: ${templateDays[i - 1].title}`,
          points: [...templateDays[i - 1].points]
        });
      } else {
        const isLast = i === numDays;
        finalDays.push({
          dayNumber: i,
          title: isLast ? `Day ${i}: Departure to ${returnCity || origin || "Home"}` : `Day ${i}: ${effectiveDest} Highlights & Leisure`,
          points: isLast
            ? [
                `Morning: Hotel breakfast, pack bags, and check-out.`,
                `Afternoon: Return transfer to ${returnCity || origin || "home"} with wonderful memories!`
              ]
            : [
                `Morning: Breakfast at hotel. Sightseeing of major attractions in ${effectiveDest}.`,
                `Afternoon: Free time for shopping and exploring local markets.`,
                `Evening: Relaxing dinner at local cafe.`,
                `Stay: Premium Hotel in ${effectiveDest}.`
              ]
        });
      }
    }
  }

  // Merge inclusions
  const finalInclusions = [];
  if (roughParsed && roughParsed.inclusions && roughParsed.inclusions.length > 0) {
    roughParsed.inclusions.forEach(inc => finalInclusions.push(inc));
  }
  const vehicleText = (specs && specs.vehicle && specs.vehicle !== "Private AC Vehicle")
    ? `Dedicated ${specs.vehicle} (Pushback Seats) for entire ${origin || 'roundtrip'} transfers & local sightseeing`
    : `Dedicated Private AC Vehicle for all transfers and sightseeing`;

  let templateIncs = (baseTemplate.inclusions || []).map(inc => {
    if (/private ac|dedicated private|sedan|suv/i.test(inc) && specs && specs.vehicle && specs.vehicle !== "Private AC Vehicle") {
      return `Dedicated ${specs.vehicle} for entire roundtrip & local sightseeing`;
    }
    return inc;
  });

  const baseIncs = templateIncs.length > 0 ? templateIncs : [
    "Accommodations with daily breakfast",
    "Private AC vehicle for all transfers and sightseeing",
    "Toll taxes, parking fees, and driver allowances"
  ];
  baseIncs.forEach(b => {
    if (!finalInclusions.some(f => f.toLowerCase().includes(b.toLowerCase().slice(0, 10)))) {
      finalInclusions.push(b);
    }
  });

  // Merge exclusions
  const finalExclusions = [];
  if (roughParsed && roughParsed.exclusions && roughParsed.exclusions.length > 0) {
    roughParsed.exclusions.forEach(exc => finalExclusions.push(exc));
  }
  const baseExcs = baseTemplate.exclusions || [
    "Flight / Train tickets",
    "Personal expenses, laundry, and tips",
    "Entry fees to monuments and adventure activities"
  ];
  baseExcs.forEach(b => {
    if (!finalExclusions.some(f => f.toLowerCase().includes(b.toLowerCase().slice(0, 10)))) {
      finalExclusions.push(b);
    }
  });

  const tips = baseTemplate.tips || [
    `Carry valid photo IDs for all travelers throughout the journey.`,
    `Check local weather forecasts before packing clothes for ${effectiveDest}.`
  ];

  const packageTitle = typeof baseTemplate.title === "function"
    ? baseTemplate.title(numDays, origin, returnCity, specs)
    : (typeof baseTemplate.title === "string" && baseTemplate.title
        ? baseTemplate.title
        : `${effectiveDest} ${numDays}D/${Math.max(1, numDays - 1)}N Tour Package`);

  return {
    destination: effectiveDest,
    daysCount: numDays,
    tripType,
    agencyName: agencyName || "Your Trusted Travel Partner",
    phone,
    email,
    title: packageTitle,
    days: finalDays,
    inclusions: finalInclusions,
    exclusions: finalExclusions,
    tips
  };
}

// ==========================================
// 7. WHATSAPP FORMATTER
// ==========================================
export function formatItineraryForWhatsapp(itinerary) {
  if (!itinerary) return "";
  const { destination, daysCount, tripType, agencyName, phone, days, inclusions, exclusions } = itinerary;

  let text = `✈️ *${destination.toUpperCase()} TOUR ITINERARY (${daysCount}D/${Math.max(1, daysCount - 1)}N)*\n`;
  if (agencyName) text += `🏢 *Prepared by:* ${agencyName}\n`;
  text += `✨ *Trip Style:* ${tripType}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 *DAY-WISE ITINERARY*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  days.forEach(d => {
    text += `📍 *${d.title}*\n`;
    d.points.forEach(p => {
      text += `• ${p}\n`;
    });
    text += `\n`;
  });

  if (inclusions && inclusions.length > 0) {
    text += `🎒 *PACKAGE INCLUSIONS:*\n`;
    inclusions.forEach(i => {
      text += `✅ ${i}\n`;
    });
    text += `\n`;
  }

  if (exclusions && exclusions.length > 0) {
    text += `❌ *PACKAGE EXCLUSIONS:*\n`;
    exclusions.forEach(e => {
      text += `• ${e}\n`;
    });
    text += `\n`;
  }

  text += `📞 *For Bookings & Customization:* ${phone || "Contact Agency"}\n`;
  text += `_Rates subject to availability at time of confirmation._\n`;

  return text;
}

// ==========================================
// 8. MARKDOWN PARSER
// ==========================================
export function parseMarkdownToStructuredItinerary(text, meta = {}) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  let title = meta.title || `${meta.destination || "Tour"} Itinerary`;
  const days = [];
  const inclusions = [];
  const exclusions = [];
  const tips = [];
  let currentSection = "";
  let currentDay = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      title = trimmed.replace(/^#\s*/, "");
      continue;
    }

    if (/^##\s*day\s*\d+/i.test(trimmed)) {
      if (currentDay) days.push(currentDay);
      currentDay = {
        dayNumber: days.length + 1,
        title: trimmed.replace(/^##\s*/, ""),
        points: [],
      };
      currentSection = "day";
      continue;
    }

    if (trimmed.toLowerCase().includes("inclusion")) {
      if (currentDay) {
        days.push(currentDay);
        currentDay = null;
      }
      currentSection = "inclusions";
      continue;
    }

    if (trimmed.toLowerCase().includes("exclusion")) {
      currentSection = "exclusions";
      continue;
    }

    if (trimmed.toLowerCase().includes("tip")) {
      currentSection = "tips";
      continue;
    }

    if (currentSection === "day" && currentDay) {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        currentDay.points.push(trimmed.replace(/^[-*]\s*/, ""));
      } else if (!trimmed.startsWith("##") && !trimmed.startsWith("---")) {
        currentDay.points.push(trimmed);
      }
    } else if (currentSection === "inclusions") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inclusions.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else if (currentSection === "exclusions") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        exclusions.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    } else if (currentSection === "tips") {
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        tips.push(trimmed.replace(/^[-*]\s*/, ""));
      }
    }
  }

  if (currentDay) days.push(currentDay);

  return {
    destination: meta.destination || "Destination",
    daysCount: days.length || meta.days || 4,
    tripType: meta.tripType || "Family Vacation",
    agencyName: meta.agencyName || "Your Travel Partner",
    phone: meta.phone || "",
    email: meta.email || "",
    title,
    days: days.length > 0 ? days : [
      {
        dayNumber: 1,
        title: `Day 1: Arrival in ${meta.destination}`,
        points: [`Arrival and transfer to hotel`, `Check-in and evening at leisure`]
      }
    ],
    inclusions: inclusions.length > 0 ? inclusions : [
      "Accommodations with daily breakfast",
      "Private AC vehicle for all transfers and sightseeing",
      "All driver allowances, tolls, and parking"
    ],
    exclusions: exclusions.length > 0 ? exclusions : [
      "Flight / Train tickets",
      "Personal expenses, tips, and adventure activities"
    ],
    tips: tips.length > 0 ? tips : [
      `Carry valid identity proofs and travel vouchers throughout the trip.`
    ]
  };
}
