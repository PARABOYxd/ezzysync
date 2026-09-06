/**
 * Smart Travel Itinerary Generator & Parser
 * Handles parsing rough notes into day-wise items, extracting inclusions/exclusions,
 * and generating authentic, realistic itineraries for any destination worldwide.
 */

// Destination Knowledge Base with rich authentic sightseeing & stays
const DESTINATION_TEMPLATES = {
  manali: {
    title: (days) => `Scenic Manali & Solang Valley ${days}D/${Math.max(1, days - 1)}N Mountain Escape`,
    days: [
      {
        title: "Arrival in Manali & Local Old Manali Walk",
        points: [
          "Morning: Arrival at Manali Volvo Bus Stand or Bhuntar Airport. Private transfer and check-in to your resort with apple orchard views.",
          "Afternoon: Unpack and freshen up. Visit the historic 450-year-old wooden Hadimba Devi Temple surrounded by cedar deodar forests and Vashisht Hot Sulphur Springs.",
          "Evening: Stroll along Mall Road and vibrant Old Manali cafes. Enjoy trout fish or wood-fired pizza and shopping for woolens and local honey.",
          "Stay: Premium Mountain View Resort in Manali."
        ]
      },
      {
        title: "Solang Valley Snow Adventure & Atal Tunnel",
        points: [
          "Morning: Hearty breakfast at resort. Drive through the scenic Solang Valley for thrilling adventure sports (Paragliding, Zorbing, Quad Biking, and Cable Car ropeway).",
          "Afternoon: Continue driving through the world's longest high-altitude highway tunnel — Atal Tunnel (9.02 km) towards Sissu waterfall in Lahaul Valley.",
          "Evening: Capture stunning snowy mountain panoramas and return to Manali resort for bonfire with light music.",
          "Stay: Premium Mountain View Resort in Manali."
        ]
      },
      {
        title: "Naggar Castle Heritage & Art Trail",
        points: [
          "Morning: Leisurely breakfast. Drive towards ancient Naggar Castle — a historic stone-wood castle offering breathtaking views of the Beas river valley.",
          "Afternoon: Visit the Nicholas Roerich Art Gallery and Tripura Sundari Temple. Enjoy lunch with local Himachali Siddu at a riverside cafe.",
          "Evening: Free time for souvenir shopping at Tibetan Monastery market or relaxing by the Beas River.",
          "Stay: Premium Mountain View Resort in Manali."
        ]
      },
      {
        title: "Kasol & Manikaran Hot Springs Excursion",
        points: [
          "Morning: Drive to scenic Parvati Valley. Stop at Kasol (Mini Israel of India) with pine forest river walks.",
          "Afternoon: Visit holy Manikaran Sahib Gurudwara and dip in natural therapeutic hot water springs. Savor sacred Langar lunch.",
          "Evening: Return to Manali for last night gala dinner.",
          "Stay: Premium Mountain View Resort in Manali."
        ]
      },
      {
        title: "Kullu River Rafting & Departure",
        points: [
          "Morning: Check-out after breakfast. Drive to Kullu for thrilling White Water Rafting in Beas River and visit famous Kullu Shawl weaving factories.",
          "Afternoon: Private drop at Volvo bus stand or airport with cherished mountain memories!"
        ]
      }
    ],
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
      "Entry tickets to monuments and camera fees",
      "Heater charges at hotels or personal laundry/room service"
    ],
    tips: [
      "Carry heavy warm woolens during winter (Oct-March) and light jackets for summer evenings.",
      "Pre-book snow dress and gear from authorized Kullu-Manali counters.",
      "Start early for Atal Tunnel and Solang Valley to avoid weekend peak traffic."
    ]
  },
  kashmir: {
    title: (days) => `Heaven on Earth Kashmir ${days}D/${Math.max(1, days - 1)}N Tour Itinerary`,
    days: [
      {
        title: "Arrival in Srinagar & Dal Lake Houseboat Experience",
        points: [
          "Morning: Pick-up from Srinagar Airport (SXR). Private transfer to Dal Lake and traditional warm welcome with hot Kashmiri Kahwa tea.",
          "Afternoon: Check-in to luxury traditional carved Wooden Houseboat. Enjoy an authentic 1-Hour Shikara Ride across Dal Lake, floating vegetable gardens, and Nehru Park.",
          "Evening: Sunset photography over Char Chinar and shopping at Meena Bazaar floating market.",
          "Stay: Premium Heritage Houseboat on Dal Lake / Nigeen Lake."
        ]
      },
      {
        title: "Gulmarg Gondola & Meadow of Flowers",
        points: [
          "Morning: Scenic drive to Gulmarg (8,825 ft) passing willow trees and saffron fields. View snow-capped Apharwat peaks.",
          "Afternoon: Experience the world's highest cable car — Gulmarg Gondola Ride (Phase 1 Kungdoor & Phase 2 Apharwat Peak at 13,780 ft). Enjoy snow sledge riding and skiing.",
          "Evening: Visit historic St. Mary’s Church and Golf Course. Return to Srinagar hotel for dinner.",
          "Stay: Deluxe Hotel in Srinagar."
        ]
      },
      {
        title: "Pahalgam Valley of Shepherds & Betaab Valley",
        points: [
          "Morning: Drive to Pahalgam via historic Avantipur Ruins and Pampore Saffron fields. Stop at Apple orchards.",
          "Afternoon: Reach Pahalgam on the banks of Lidder River. Explore Betaab Valley (named after Bollywood film), Aru Valley & Chandanwari.",
          "Evening: Riverside relaxation, photography and trout fishing by Lidder stream.",
          "Stay: Riverside Resort in Pahalgam."
        ]
      },
      {
        title: "Srinagar Mughal Gardens & Old City Heritage",
        points: [
          "Morning: Drive back to Srinagar. Explore UNESCO-recognized Mughal Gardens: Shalimar Bagh, Nishat Bagh (Garden of Bliss) and Cheshma Shahi.",
          "Afternoon: Visit sacred Shankaracharya Temple perched atop hill for 360-degree aerial views of Srinagar city and Dal Lake.",
          "Evening: Stroll through Lal Chowk and Old Srinagar for Kashmiri dry fruits, walnut woodwork, and genuine Pashmina shawls.",
          "Stay: Deluxe Hotel in Srinagar."
        ]
      },
      {
        title: "Sonamarg Golden Meadow Excursion",
        points: [
          "Morning: Day trip to Sonamarg ('Meadow of Gold') on the Srinagar-Leh highway with Sindh River rushing alongside.",
          "Afternoon: Pony ride / 4x4 drive to magnificent Thajiwas Glacier where snow remains year-round.",
          "Evening: Return to Srinagar for special Kashmiri Wazwan farewell feast.",
          "Stay: Deluxe Hotel in Srinagar."
        ]
      },
      {
        title: "Souvenir Shopping & Airport Departure",
        points: [
          "Morning: Relish hot breakfast. Last-minute shopping for Kashmiri saffron, walnuts, and papier-mâché handicrafts.",
          "Afternoon: Private drop at Srinagar Airport with unforgettable memories of Kashmir paradise!"
        ]
      }
    ],
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
      "Always book Gulmarg Gondola Phase 2 tickets 2-4 weeks in advance on the official JKTDC website.",
      "Postpaid SIM cards (Jio/Airtel/BSNL) work in Jammu & Kashmir; prepaid outside SIMs do not work.",
      "Carry woolens even during summer as Gulmarg and Sonamarg glaciers get chilly."
    ]
  },
  aadrai: {
    title: (days) => `🌿 Aadrai Jungle Trek ${days}D/${Math.max(1, days - 1)}N Malshej Ghat Wilderness Adventure`,
    days: [
      {
        title: "Mumbai/Pune Departure, Khireshwar Base & Deep Jungle Trek",
        points: [
          "Morning: Early morning pickup from Mumbai / Pune (05:00 AM) by private vehicle. Scenic drive through Kalyan - Malshej Ghat highway with misty Sahyadri mountain views.",
          "Afternoon: Reach base village Khireshwar (near Pimpalgaon Joga Dam). Traditional breakfast and briefing by certified trek leader. Enter the dense Aadrai rainforest trail — navigate crystal-clear stream crossings, ancient Bhairavnath caves, and lush evergreen canopy.",
          "Evening: Reach the breathtaking deep gorge viewpoint of Kalu Waterfall (one of highest in Maharashtra). Rest and descend safely back to base village by 04:30 PM. Enjoy hot home-cooked Maharashtrian Pithla Bhakri dinner.",
          "Stay: Lakeside Alpine Camping or Rustic Homestay near Pimpalgaon Joga Dam / Khireshwar village."
        ]
      },
      {
        title: "Pimpalgaon Joga Dam Sunrise, Malshej Ghat Waterfalls & Return",
        points: [
          "Morning: Wake up to serene lakeside sunrise over Pimpalgaon Joga Dam with birdwatching (flamingos and migratory birds in season). Visit ancient 10th-century Nageshwar Temple in Khireshwar.",
          "Afternoon: Relish authentic village breakfast. Drive back through Malshej Ghat pass with scenic stops at roadside cascading waterfalls and rock-cut viewing points.",
          "Evening: Drop-off at Mumbai / Pune with unforgettable Sahyadri jungle trekking memories!"
        ]
      },
      {
        title: "Harishchandragad Base & Village Exploration",
        points: [
          "Morning: Short exploratory hike to the foot of historic Harishchandragad fort and forest trails.",
          "Afternoon: Riverside relaxation and traditional lunch prepared with locally grown organic ingredients.",
          "Evening: Scenic evening transfer back to city."
        ]
      }
    ],
    inclusions: [
      "Certified Local Mountain & Trek Leader with first-aid support",
      "Forest Department Entry Permits & Eco-tourism Fees",
      "Homestay / Alpine Tent Accommodation with bedding",
      "Traditional Village Meals (Breakfast, Hot Lunch & Dinner)",
      "Private Vehicle Transport from Mumbai or Pune including tolls and parking",
      "Safety gear and guided stream crossing support"
    ],
    exclusions: [
      "Personal trekking gear (high-grip trekking shoes, rain poncho, dry bags)",
      "Personal insurance or medical expenses",
      "Packaged drinking water, soft drinks, or personal snacks"
    ],
    tips: [
      "Aadrai is an authentic raw jungle trail — wearing high-ankle trekking shoes with strong grip is mandatory.",
      "Carry waterproof pouches or dry bags for phones and electronics due to stream crossings and monsoons.",
      "Carry salt or leech repellant sprays and stay with the trek group at all times inside the dense forest."
    ]
  },
  chopta: {
    title: (days) => `🏔️ Chopta Tungnath & Chandrashila ${days}D/${Math.max(1, days - 1)}N Himalayan Trek`,
    days: [
      {
        title: "Delhi / Haridwar to Chopta via Devprayag & Rudraprayag",
        points: [
          "Morning: Early departure from Delhi via Meerut Expressway to Haridwar / Rishikesh. Ascend into the Himalayas along the Alaknanda River.",
          "Afternoon: Stop at sacred Devprayag to witness the holy confluence of Alaknanda and Bhagirathi rivers forming the Ganga. Continue via Rudraprayag and Kund towards Chopta (8,790 ft).",
          "Evening: Arrive in Chopta / Sari alpine village. Savor hot Garhwali herbal ginger tea and admire sunset reflections over Chaukhamba peaks.",
          "Stay: Swiss Alpine Camps or Cozy Mountain Cottage in Chopta / Sari."
        ]
      },
      {
        title: "The Sacred Tungnath Temple & Chandrashila Peak Summit (13,100 ft)",
        points: [
          "Morning (06:00 AM): Light breakfast and drive to Chopta base trailhead. Begin paved stone trek (3.5 km) through rhododendron and pine forests to Tungnath Temple — the highest Shiva shrine in the world (12,073 ft).",
          "Afternoon: Pray at the historic ancient Tungnath Temple, then begin the steep 1 km ridge climb to Chandrashila Summit (13,100 ft). Experience 360-degree panoramic views of Chaukhamba, Nanda Devi, Trishul, Kedar Dome, and Bandarpunch peaks.",
          "Evening: Descend back to Chopta base by 03:30 PM. Warm evening bonfire under sparkling clear night skies with hearty dinner.",
          "Stay: Swiss Alpine Camps in Chopta."
        ]
      },
      {
        title: "Pristine Deoria Tal Lake Trek & Omkareshwar Ukhimath",
        points: [
          "Morning: Drive to Sari village base. Begin 2.5 km gentle scenic trek through dense oak forests to the crystal-clear Deoria Tal (7,998 ft).",
          "Afternoon: Witness the stunning mirror reflection of snow-capped Chaukhamba peaks in the lake waters. Leisure walk and packed lunch by the lake.",
          "Evening: Descend to Sari village. Visit ancient Omkareshwar Temple in Ukhimath (winter abode of Lord Kedarnath).",
          "Stay: Swiss Alpine Camps in Chopta or Riverside Resort in Rudraprayag."
        ]
      },
      {
        title: "Scenic Downhill Return Journey via Rishikesh to Delhi",
        points: [
          "Morning: Hearty breakfast, pack bags, and begin scenic downhill drive following the river valley.",
          "Afternoon: Halt at Rishikesh for lunch by the Ganges and visit Ram Jhula / Laxman Jhula.",
          "Evening: Smooth expressway drive back to Delhi. Drop-off at designated point with cherished Himalayan summit memories!"
        ]
      }
    ],
    inclusions: [
      "Accommodations in Swiss Alpine Camps / Cottages with attached washrooms",
      "Daily Nutritious Breakfast & Dinner (MAP Plan)",
      "Experienced Himalayan Trek Guide for Tungnath & Chandrashila Summit",
      "Kedarnath Wildlife Sanctuary Forest Entry Permits",
      "Dedicated Private Cab for entire Delhi-Chopta-Delhi journey including tolls, parking & driver night charges"
    ],
    exclusions: [
      "Personal trekking poles, heavy winter jackets, and thermals",
      "Pony / mule charges on trek (if hired)",
      "En-route lunches and personal expenses"
    ],
    tips: [
      "Night temperatures in Chopta drop significantly; carry 3-layer warm clothing (thermal, fleece, windproof jacket).",
      "Start the Chandrashila summit push early in the morning to enjoy crystal-clear panoramic views before midday clouds roll in.",
      "Stay well-hydrated throughout the trek to ensure smooth acclimatization."
    ]
  },
  mussoorie: {
    title: (days) => `🌲 Queen of Hills Mussoorie & Dhanaulti ${days}D/${Math.max(1, days - 1)}N Getaway`,
    days: [
      {
        title: "Arrival via Dehradun & Mussoorie Mall Road Walk",
        points: [
          "Morning: Pick-up from Dehradun Airport or Railway Station. Scenic 1.5-hour hill drive ascending to Mussoorie (6,580 ft).",
          "Afternoon: Check-in to hotel overlooking the Doon Valley. Relax, unpack, and freshen up.",
          "Evening: Stroll along vibrant Mall Road, Kulri Bazaar, and Library Chowk. Take the ropeway cable car to Gun Hill for sunset panoramas.",
          "Stay: Deluxe Valley View Hotel in Mussoorie."
        ]
      },
      {
        title: "Kempty Falls, George Everest Peak & Cloud's End",
        points: [
          "Morning: Visit the iconic Kempty Falls cascading down 40 feet with refreshing mountain pools.",
          "Afternoon: Drive to Sir George Everest House and hike up to George Everest Peak for 360-degree views of the Aglar River Valley and snowy Himalayan ranges.",
          "Evening: Explore Cloud's End surrounded by dense deodar and oak forests. Return to hotel for dinner.",
          "Stay: Deluxe Valley View Hotel in Mussoorie."
        ]
      },
      {
        title: "Landour Charm, Lal Tibba & Dhanaulti Eco Park",
        points: [
          "Morning: Drive to tranquil Landour cantonment. Visit historic Char Dukan, savor famous apple pie, and view snow peaks through telescope at Lal Tibba (highest point in Mussoorie).",
          "Afternoon: Excursion to pristine Dhanaulti (24 km). Walk among towering deodars in Amber & Dhara Eco Parks. Optional visit to Surkanda Devi Temple.",
          "Evening: Drive back to Mussoorie. Enjoy cafe hopping and shopping for handmade wooden souvenirs.",
          "Stay: Deluxe Valley View Hotel in Mussoorie."
        ]
      },
      {
        title: "Company Garden & Return Departure",
        points: [
          "Morning: Visit colorful Mussoorie Company Garden with artificial waterfalls, flower nursery, and amusement rides.",
          "Afternoon: Check-out and private downhill transfer to Dehradun Airport or Railway Station with sweet Himalayan memories!"
        ]
      }
    ],
    inclusions: [
      "Deluxe Hotel Stay with Daily Buffet Breakfast & Dinner",
      "Private AC Sedan / SUV for transfers and all local sightseeing tours",
      "Full-day excursion to Kempty Falls, George Everest, and Dhanaulti",
      "Driver beta, toll taxes, parking, and green cess"
    ],
    exclusions: [
      "Airfare or Train tickets to Dehradun",
      "Ropeway tickets at Gun Hill and adventure activities at Kempty",
      "Personal shopping, cafe bills, and tips"
    ],
    tips: [
      "Landour roads are narrow; walking or hiring a smaller local cab is recommended for Char Dukan.",
      "Try authentic Tibetan momos and steamed thukpa on Mall Road.",
      "Carry light woolens during summer and heavy jackets during winter (Dec-Feb)."
    ]
  },
  goa: {
    title: (days) => `Sun, Sand & Sea Goa ${days}D/${Math.max(1, days - 1)}N Beach Holiday`,
    days: [
      {
        title: "Arrival in Goa & Sunset Beach Chill",
        points: [
          "Morning: Pick-up from Goa Dabolim/Mopa Airport or Madgaon/Thivim Station. Private transfer to your coastal resort.",
          "Afternoon: Check-in, refresh by swimming pool. Stroll around Calangute or Candolim beach.",
          "Evening: Sunset cocktail at a beach shack with acoustic music. Enjoy the lively Goan evening vibe.",
          "Stay: Beachside Resort in North Goa."
        ]
      },
      {
        title: "North Goa Forts, Water Sports & Baga Nightlife",
        points: [
          "Morning: Visit 17th-century Fort Aguada and Light House with panoramic Arabian Sea views.",
          "Afternoon: Head to Anjuna and Baga beach. Enjoy watersports: Parasailing, Jet Ski, Banana Boat ride, and Bumper ride.",
          "Evening: Experience buzzing nightlife at iconic Tito's Lane or open-air seaside club.",
          "Stay: Beachside Resort in North Goa."
        ]
      },
      {
        title: "South Goa Heritage, Spice Plantation & Mandovi River Cruise",
        points: [
          "Morning: Visit Old Goa UNESCO World Heritage Churches: Basilica of Bom Jesus and Se Cathedral.",
          "Afternoon: Tour a tropical Spice Plantation with traditional Goan buffet lunch served on banana leaf.",
          "Evening: 1-Hour Mandovi River Sunset Cruise featuring live Goan folk dance and DJ music.",
          "Stay: Beachside Resort in North Goa."
        ]
      },
      {
        title: "Dudhsagar Waterfalls & South Goa Pristine Beaches",
        points: [
          "Morning: Early morning jeep safari through Bhagwan Mahavir Wildlife Sanctuary to magnificent Dudhsagar Waterfalls.",
          "Afternoon: Swim in the natural freshwater pool beneath the waterfall and feed monkeys.",
          "Evening: Relax at serene white-sand Palolem or Colva beach in South Goa.",
          "Stay: Beachside Resort in North Goa."
        ]
      },
      {
        title: "Souvenir Shopping & Airport Departure",
        points: [
          "Morning: Relish buffet breakfast. Quick shopping for cashew nuts, authentic Goan feni, and beachwear at Panaji market.",
          "Afternoon: Check-out and private transfer to airport/station with sun-kissed memories!"
        ]
      }
    ],
    inclusions: [
      "Accommodation in Beachside Resort with Swimming Pool",
      "Daily Buffet Breakfast at Resort",
      "Private AC Vehicle for all airport transfers and sightseeing tours",
      "1-Hour Mandovi River Sunset Cruise tickets",
      "All driver allowances, parking, fuel, and toll charges"
    ],
    exclusions: [
      "Airfare or Train tickets",
      "Water sports charges & Dudhsagar jeep safari tickets",
      "Lunches and beverages outside hotel plan",
      "Personal expenses, club entry fees, and tips"
    ],
    tips: [
      "Wear comfortable cotton clothes and high SPF sunscreen.",
      "Rent scooters or self-drive cars only with helmets and valid driving licenses.",
      "Try authentic Goan fish curry thali at authentic local shacks like Fisherman's Wharf or Martins Corner."
    ]
  },
  dubai: {
    title: (days) => `Dubai Extravaganza ${days}D/${Math.max(1, days - 1)}N Luxury Tour`,
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
      "Pre-book Burj Khalifa sunset slots as tickets sell out quickly.",
      "Carry a light jacket as Dubai malls, metros, and indoor attractions maintain cold air conditioning."
    ]
  },
  bali: {
    title: (days) => `Tropical Paradise Bali ${days}D/${Math.max(1, days - 1)}N Holiday Itinerary`,
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
          "Morning: Drive to Ubud cultural hub. Walk through the sacred Ubud Monkey Forest Sanctuary with hundreds of grey macaques.",
          "Afternoon: Visit iconic Tegalalang Rice Terraces and soar high over the jungle on the famous Aloha Bali Jungle Swing.",
          "Evening: Tour coffee plantation tasting Luwak coffee, then visit Tirta Empul Holy Water Temple.",
          "Stay: Luxury Pool Villa / Resort in Ubud."
        ]
      },
      {
        title: "Kintamani Volcano, Batur Lake & Waterfall",
        points: [
          "Morning: Scenic drive to Kintamani overlooking active Mount Batur volcano and crater lake.",
          "Afternoon: Lunch with volcano panoramic views. Visit stunning Tegenungan or Kanto Lampo cascading waterfall.",
          "Evening: Traditional Balinese Kecak and Fire dance performance under open sky.",
          "Stay: Luxury Pool Villa / Resort in Ubud."
        ]
      },
      {
        title: "Nusa Penida Island Tour: Kelingking Beach & Angel's Billabong",
        points: [
          "Morning: Early morning speedboat transfer from Sanur harbour to Nusa Penida island.",
          "Afternoon: Visit jaw-dropping T-Rex cliff at Kelingking Beach, Broken Beach, and natural infinity pool at Angel's Billabong.",
          "Evening: Return speedboat to Bali mainland and relax.",
          "Stay: Luxury Beach Resort in Seminyak."
        ]
      },
      {
        title: "Uluwatu Sunset Sea Temple & Souvenir Shopping",
        points: [
          "Morning: Visit watersports center at Tanjung Benoa (Banana boat, parasailing, jet ski).",
          "Afternoon: Perched 70 meters high on sea cliffs, visit historic Uluwatu Temple overlooking crashing waves.",
          "Evening: Relish Balinese street food and shopping at Seminyak flea market.",
          "Stay: Luxury Beach Resort in Seminyak."
        ]
      },
      {
        title: "Balinese Spa & Airport Departure",
        points: [
          "Morning: Authentic 1-hour Balinese herbal aroma massage at resort spa.",
          "Afternoon: Check-out and private transfer to DPS Airport with sweet memories!"
        ]
      }
    ],
    inclusions: [
      "Private Pool Villa / 4-Star Resort Stay",
      "Daily Floating / Buffet Breakfast at Resort",
      "Private AC Car with English-speaking Driver Guide for all days",
      "Full-Day Nusa Penida West Island Tour with Speedboat tickets & Island Transport",
      "Bali Jungle Swing & Tegalalang entrance tickets",
      "Return Airport Transfers and all parking/toll fees"
    ],
    exclusions: [
      "International flight tickets",
      "Bali Tourist Tax and Indonesian Visa on Arrival",
      "Water sports activities in Tanjung Benoa",
      "Personal expenses, alcoholic beverages, and tipping"
    ],
    tips: [
      "Carry cash (Indonesian Rupiah) for local markets and temple sarong rentals.",
      "Wear comfortable shoes for Kelingking Beach and waterfall steps.",
      "Respect local Balinese temple dress codes (sarongs provided at temple entrances)."
    ]
  },
  kerala: {
    title: (days) => `God's Own Country Kerala ${days}D/${Math.max(1, days - 1)}N Tour`,
    days: [
      {
        title: "Arrival in Kochi & Drive to Munnar Hills",
        points: [
          "Morning: Pick-up from Kochi Airport (COK) or Ernakulam Railway Station. Scenic 4-hour drive to Munnar misty hills.",
          "Afternoon: Stop en route at Cheeyappara and Valara waterfalls amidst lush spice plantations.",
          "Evening: Check-in to Munnar tea estate resort. Stroll through fragrant tea gardens.",
          "Stay: Nature Resort in Munnar."
        ]
      },
      {
        title: "Munnar Tea Estates & Eravikulam National Park",
        points: [
          "Morning: Visit Eravikulam National Park (Rajamalai) home to endangered Nilgiri Tahr mountain goats.",
          "Afternoon: Visit the Tata Tea Museum to learn tea manufacturing and Mattupetty Dam, Echo Point, and Kundala Lake with boating.",
          "Evening: Watch Kathakali dance and Kalaripayattu martial arts show.",
          "Stay: Nature Resort in Munnar."
        ]
      },
      {
        title: "Thekkady Periyar Wildlife Sanctuary & Spice Trails",
        points: [
          "Morning: Drive through Western Ghats to Thekkady. Check-in to forest resort.",
          "Afternoon: Guided walking tour of organic Spice Plantation (Cardamom, Pepper, Cinnamon).",
          "Evening: Boat safari on Periyar Lake inside Tiger Reserve to spot wild elephants, bison, and exotic birds.",
          "Stay: Deluxe Resort in Thekkady."
        ]
      },
      {
        title: "Alleppey Backwaters Houseboat Cruise",
        points: [
          "Morning: Drive to Alleppey ('Venice of the East'). Board traditional luxury Kerala Houseboat (Kettuvallam) at 12:00 PM.",
          "Afternoon: Cruise through scenic palm-fringed canals, paddy fields, and backwater lagoons. Relish traditional Kerala Sadya lunch with Karimeen fish fry.",
          "Evening: Sunset over Vembanad Lake. Candlelit dinner on board.",
          "Stay: AC Deluxe Private Houseboat in Alleppey."
        ]
      },
      {
        title: "Kochi Heritage Sightseeing & Departure",
        points: [
          "Morning: Hearty Kerala breakfast on houseboat. Check-out and drive back to Kochi.",
          "Afternoon: Visit historic Fort Kochi: Chinese Fishing Nets, St. Francis Church, and Jewish Synagogue in Mattancherry.",
          "Evening: Private drop at Kochi Airport/Station with pleasant God's Own Country memories!"
        ]
      }
    ],
    inclusions: [
      "Accommodations in Munnar, Thekkady, and Alleppey Houseboat",
      "All meals on Alleppey Houseboat (Lunch, Evening Tea, Dinner, Breakfast)",
      "Daily Breakfast at Munnar & Thekkady resorts",
      "Dedicated AC Private Vehicle for entire tour including transfers and sightseeing",
      "Driver beta, toll fees, parking, and interstate permits"
    ],
    exclusions: [
      "Train or Flight tickets to Kochi",
      "Periyar boating tickets and Eravikulam park entrance fees",
      "Kathakali & Kalaripayattu show tickets and ayurvedic massages",
      "Personal expenses and meals outside inclusions"
    ],
    tips: [
      "Try authentic Kerala banana chips fried in fresh coconut oil.",
      "Houseboat AC operates from 9:00 PM to 6:00 AM in standard categories unless booked as full-time premium AC.",
      "Pre-book Periyar wildlife boating online on Kerala Forest Department portal."
    ]
  },
  thailand: {
    title: (days) => `Amazing Thailand ${days}D/${Math.max(1, days - 1)}N Bangkok & Phuket Tour`,
    days: [
      {
        title: "Arrival in Phuket & Patong Beach Vibe",
        points: [
          "Morning: Arrive at Phuket International Airport (HKT). Private transfer to your beach hotel in Patong/Karon.",
          "Afternoon: Check-in, relax by pool, and stroll around Patong Beach.",
          "Evening: Visit buzzing Bangla Road nightlife with street food, live music, and night markets.",
          "Stay: 4-Star Beachfront Resort in Phuket."
        ]
      },
      {
        title: "Phi Phi Island Speedboat Tour & Maya Bay",
        points: [
          "Morning: Speedboat cruise to Phi Phi Islands. Visit Maya Bay (famed for 'The Beach' movie) with emerald waters.",
          "Afternoon: Snorkeling amidst coral reefs at Pileh Lagoon and Viking Cave. Buffet lunch on Phi Phi Don.",
          "Evening: Relax at Monkey Beach and cruise back to Phuket.",
          "Stay: 4-Star Beachfront Resort in Phuket."
        ]
      },
      {
        title: "Phuket Big Buddha, Wat Chalong & Flight to Bangkok",
        points: [
          "Morning: Visit the 45-meter marble Big Buddha perched atop Nakkerd Hill with 360-degree island views.",
          "Afternoon: Tour revered Wat Chalong temple, followed by transfer to airport for short flight to Bangkok.",
          "Evening: Arrive in Bangkok, check-in to city center hotel.",
          "Stay: 4-Star Hotel in Central Bangkok."
        ]
      },
      {
        title: "Bangkok Temples, Chao Phraya Dinner Cruise",
        points: [
          "Morning: Guided temple tour: Wat Pho (Temple of Reclining Buddha) and Wat Arun (Temple of Dawn).",
          "Afternoon: Shopping extravaganza at Platinum Fashion Mall and CentralWorld.",
          "Evening: Romantic 2-hour luxury Chao Phraya Princess Dinner Cruise with live jazz band and illuminated palace views.",
          "Stay: 4-Star Hotel in Bangkok."
        ]
      },
      {
        title: "Safari World & Marine Park / Departure",
        points: [
          "Morning: Visit Safari World open zoo and Marine Park with dolphin and stunt shows.",
          "Afternoon: Last-minute shopping at MBK Center and private drop at Suvarnabhumi Airport (BKK)."
        ]
      }
    ],
    inclusions: [
      "Daily Buffet Breakfast at Hotels",
      "Phi Phi Island Full Day Tour by Speedboat with National Park fees & Lunch",
      "Chao Phraya Princess Luxury Dinner Cruise with live music",
      "Bangkok City & Temple Tour (Wat Pho & Wat Trimitr)",
      "All Airport Transfers by Private AC Vehicle",
      "All toll fees, parking, and driver allowances"
    ],
    exclusions: [
      "International flights and Phuket-Bangkok domestic flight",
      "Thailand Tourist Visa on Arrival fees",
      "Water sports and personal shopping expenses",
      "Tips for driver and tour guides"
    ],
    tips: [
      "Shoulders and knees must be covered when visiting temples in Bangkok.",
      "Use Grab taxi app for seamless and honest meter taxi rides in Bangkok.",
      "Keep 7-Eleven store cards or cash handy for small everyday purchases."
    ]
  }
};

/**
 * Parses user rough notes to extract structured days, stay plans, and inclusions/exclusions
 */
export function parseUserRoughNotes(text, defaultDays = 4, destinationName = "Your Destination") {
  if (!text || !text.trim()) return null;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const detectedDays = [];
  const detectedInclusions = [];
  const detectedExclusions = [];
  let currentDay = null;

  // Regex patterns
  const dayPattern = /^(?:day\s*(\d+)|d(\d+)|(\d+)st\s*day|(\d+)nd\s*day|(\d+)rd\s*day|(\d+)th\s*day)[\s:.-]*(.*)/i;
  const inclusionHeaderPattern = /(?:inclusion|included|inclusions|package includes|included rahega|ye include)/i;
  const exclusionHeaderPattern = /(?:exclusion|excluded|exclusions|package excludes|not included|exclude)/i;

  let currentSection = "days";

  for (let line of lines) {
    // Check if line switches section
    if (inclusionHeaderPattern.test(line)) {
      currentSection = "inclusions";
      // Check if items are written on the same line after colon
      const parts = line.split(/[:\-]/);
      if (parts.length > 1 && parts[1].trim()) {
        parts[1].split(/[,;]/).forEach(item => {
          if (item.trim()) detectedInclusions.push(item.trim());
        });
      }
      continue;
    }

    if (exclusionHeaderPattern.test(line)) {
      currentSection = "exclusions";
      const parts = line.split(/[:\-]/);
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
        // Can be comma separated
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

    // Days parsing
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
      // First lines before "Day 1" might just be rough text
      // Check if it mentions inclusions like "included: meal, cab"
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

  // If user provided a paragraph instead of line-by-line Day 1, Day 2
  if (detectedDays.length === 0 && text.trim().length > 20) {
    // Try splitting by sentences or Day keywords inside paragraph
    const regex = /(?:day\s*\d+|d\d+)[:\s-]/gi;
    const splitParts = text.split(regex);
    if (splitParts.length > 1) {
      splitParts.forEach((part, idx) => {
        if (!part.trim()) return;
        const clean = part.trim();
        detectedDays.push({
          dayNumber: idx,
          title: `Day ${idx}: Highlights & Activities`,
          points: [clean]
        });
      });
    }
  }

  return {
    hasRoughNotes: detectedDays.length > 0 || detectedInclusions.length > 0,
    days: detectedDays,
    inclusions: detectedInclusions,
    exclusions: detectedExclusions
  };
}

/**
 * Procedurally synthesizes authentic itinerary for any destination if not in standard dictionary
 */
function synthesizeCustomDestination(destination, days, tripStyle) {
  const destClean = destination.trim();
  const dayCards = [];

  const activityThemes = [
    {
      titleSuffix: "Arrival & Orientation",
      morning: `Arrival at ${destClean} airport / main terminal. Warm meet-and-greet with our local representative and private transfer to your hotel.`,
      afternoon: `Check-in, relax, and unpack. Take an easy orientation walk around the local central avenue and surrounding neighborhood.`,
      evening: `Sunset stroll at ${destClean}'s popular waterfront / central square. Enjoy welcome dinner at a celebrated local restaurant.`,
      stay: `Handpicked Hotel / Resort in central ${destClean}.`
    },
    {
      titleSuffix: "Iconic Sights & Cultural Heritage",
      morning: `Hearty breakfast. Guided city sightseeing tour covering ${destClean}'s primary historic landmarks, museums, and architectural wonders.`,
      afternoon: `Visit renowned cultural quarter. Sample regional street delicacies and artisan handicraft workshops for lunch.`,
      evening: `Scenic viewpoint sunset observation. Leisure stroll through vibrant twilight markets.`,
      stay: `Handpicked Hotel / Resort in ${destClean}.`
    },
    {
      titleSuffix: "Scenic Excursion & Nature Adventure",
      morning: `Scenic morning drive to the outskirts of ${destClean} featuring picturesque natural landscapes, hills, or pristine lakeshores.`,
      afternoon: `Enjoy thrilling outdoor recreational activities, photography stops, and a leisurely lunch overlooking breathtaking panoramic vistas.`,
      evening: `Return to the main city. Relaxing spa session or cozy evening cafe hopping with live local music.`,
      stay: `Handpicked Hotel / Resort in ${destClean}.`
    },
    {
      titleSuffix: "Hidden Gems & Gastronomic Food Trail",
      morning: `Visit popular botanical gardens, historic temples/churches, or royal palaces around ${destClean}.`,
      afternoon: `Curated authentic food tasting walk discovering authentic regional recipes, spices, and famous local bakeries.`,
      evening: `Evening river/lake boat ride or rooftop lounge dinner showcasing the sparkling city skyline.`,
      stay: `Handpicked Hotel / Resort in ${destClean}.`
    },
    {
      titleSuffix: "Day Trip & Countryside Discovery",
      morning: `Full day excursion to the most famous nearby heritage town or natural sanctuary around ${destClean}.`,
      afternoon: `Guided heritage walk through scenic cobblestone alleys or nature trails with traditional country-style lunch.`,
      evening: `Sunset photography stop at an iconic panoramic vantage point before driving back to the hotel.`,
      stay: `Handpicked Hotel / Resort in ${destClean}.`
    },
    {
      titleSuffix: "Leisure, Souvenirs & Farewell Dinner",
      morning: `Relaxed morning breakfast. Free time to explore favorite local boutique shops and souvenir bazaars for authentic gifts.`,
      afternoon: `Special celebratory farewell lunch featuring ${destClean}'s signature dishes.`,
      evening: `Evening leisure walk and packing with unforgettable memories.`,
      stay: `Handpicked Hotel / Resort in ${destClean}.`
    },
    {
      titleSuffix: "Last-Minute Shopping & Departure",
      morning: `Enjoy a lavish breakfast. Check-out and last-minute duty-free shopping.`,
      afternoon: `Private transfer to ${destClean} airport / station with cherished memories of your unforgettable journey!`
    }
  ];

  for (let i = 1; i <= days; i++) {
    const isLastDay = i === days;
    const theme = isLastDay
      ? activityThemes[activityThemes.length - 1]
      : activityThemes[(i - 1) % (activityThemes.length - 1)];

    const points = [];
    if (theme.morning) points.push(`Morning: ${theme.morning}`);
    if (theme.afternoon) points.push(`Afternoon: ${theme.afternoon}`);
    if (theme.evening && !isLastDay) points.push(`Evening: ${theme.evening}`);
    if (theme.stay && !isLastDay) points.push(`Stay: ${theme.stay}`);

    dayCards.push({
      dayNumber: i,
      title: `Day ${i}: ${destClean} ${theme.titleSuffix}`,
      points
    });
  }

  return {
    title: `${destClean} ${days}D/${Math.max(1, days - 1)}N ${tripStyle || "Tour Package"}`,
    days: dayCards,
    inclusions: [
      `Accommodations in 3/4-Star Hotels with daily breakfast`,
      `Private AC vehicle for all airport transfers and city sightseeing in ${destClean}`,
      `Experienced English / Hindi speaking local driver & tour coordinator`,
      `All toll taxes, parking charges, fuel, and driver allowances`
    ],
    exclusions: [
      `Airfare or Train tickets to and from ${destClean}`,
      `Personal expenses, tips, porterage, and laundry services`,
      `Monument entry tickets and optional adventure activities`,
      `Any meals not explicitly mentioned in inclusions`
    ],
    tips: [
      `Keep local currency and payment apps ready for convenient shopping in ${destClean}.`,
      `Carry appropriate weather clothing and comfortable walking footwear for sightseeing tours.`,
      `Pre-book popular attractions in advance during peak travel seasons.`
    ]
  };
}

/**
 * Main Generator function that marries user rough notes + destination intelligence + trip parameters
 */
export function buildSmartItinerary({
  destination,
  days = 4,
  tripType = "Family Vacation",
  agencyName = "",
  phone = "",
  email = "",
  roughNotes = ""
}) {
  let effectiveDest = (destination || "").trim();
  const lowerCommand = (roughNotes || "").toLowerCase();

  // If destination is empty or simple, infer from command if possible
  if (!effectiveDest || effectiveDest.toLowerCase() === "destination") {
    for (let key of Object.keys(DESTINATION_TEMPLATES)) {
      if (lowerCommand.includes(key)) {
        if (key === "aadrai") effectiveDest = "Aadrai Jungle Trek";
        else if (key === "chopta") effectiveDest = "Chopta Tungnath";
        else if (key === "mussoorie") effectiveDest = "Mussoorie";
        else effectiveDest = key.charAt(0).toUpperCase() + key.slice(1);
        break;
      }
    }
    if (!effectiveDest) {
      // Try to extract from "itinerary of/for [Place]"
      const match = roughNotes.match(/(?:itinerary\s+(?:of|for)|trip\s+(?:to|for))\s+([a-zA-Z\s]+?)(?:\s+(?:from|with|in|for|\d+|\.|$))/i);
      if (match && match[1]) {
        effectiveDest = match[1].trim();
      } else {
        effectiveDest = "Custom Tour";
      }
    }
  }

  const destKey = effectiveDest.toLowerCase();
  const numDays = Math.max(1, Number(days) || 4);

  // Check if user provided rough notes
  const roughParsed = parseUserRoughNotes(roughNotes, numDays, effectiveDest);

  // Find destination in preset knowledge base or synthesize
  let baseTemplate = null;
  for (let key of Object.keys(DESTINATION_TEMPLATES)) {
    if (destKey.includes(key) || lowerCommand.includes(key)) {
      baseTemplate = DESTINATION_TEMPLATES[key];
      break;
    }
  }

  if (!baseTemplate) {
    baseTemplate = synthesizeCustomDestination(effectiveDest, numDays, tripType);
  }

  // Build the day-wise itinerary
  const finalDays = [];

  // If user provided specific rough days, honor and enhance them!
  if (roughParsed && roughParsed.days && roughParsed.days.length > 0) {
    roughParsed.days.forEach((rd, idx) => {
      const dayNum = idx + 1;
      let title = rd.title || `Day ${dayNum}: Sightseeing & Activities`;
      if (!title.toLowerCase().startsWith("day")) {
        title = `Day ${dayNum}: ${title}`;
      }

      // If user provided a short note, expand into structured points
      let points = [];
      if (rd.points && rd.points.length > 0) {
        rd.points.forEach(p => {
          // If the user already wrote morning/afternoon, keep as is
          if (/^(morning|afternoon|evening|night|stay):/i.test(p)) {
            points.push(p);
          } else {
            // Check if point mentions stay
            if (/stay|hotel|resort|night stay/i.test(p)) {
              points.push(`Stay & Relax: ${p}`);
            } else {
              points.push(`Activity: ${p}`);
            }
          }
        });
      }

      // Add default stay point if not explicitly mentioned
      const hasStay = points.some(p => /stay/i.test(p));
      if (!hasStay && dayNum < numDays) {
        points.push(`Stay: Comfortable Hotel / Resort in ${destination}.`);
      }

      finalDays.push({
        dayNumber: dayNum,
        title,
        points: points.length > 0 ? points : [`Explore top attractions and local sights in ${destination}.`]
      });
    });

    // If user rough notes had fewer days than requested numDays, fill in the remaining days
    if (finalDays.length < numDays) {
      for (let i = finalDays.length + 1; i <= numDays; i++) {
        const isLastDay = i === numDays;
        if (isLastDay) {
          finalDays.push({
            dayNumber: i,
            title: `Day ${i}: Souvenir Shopping & Departure`,
            points: [
              `Morning: Delicious breakfast at hotel. Check-out and last-minute local shopping.`,
              `Afternoon: Private transfer to airport / station with unforgettable memories of ${destination}!`
            ]
          });
        } else {
          finalDays.push({
            dayNumber: i,
            title: `Day ${i}: ${destination} Exploration & Leisure`,
            points: [
              `Morning: Hearty breakfast. Visit local scenic viewpoints and cultural highlights.`,
              `Afternoon: Leisure time for street shopping and trying famous local cuisine.`,
              `Evening: Sunset walk and dinner at a top-rated restaurant.`,
              `Stay: Comfortable Hotel / Resort in ${destination}.`
            ]
          });
        }
      }
    }
  } else {
    // Generate authentic days from base template
    const templateDays = typeof baseTemplate.days === "function" ? baseTemplate.days(numDays) : baseTemplate.days;
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
          title: isLast ? `Day ${i}: Departure with Sweet Memories` : `Day ${i}: ${destination} Highlights & Leisure`,
          points: isLast
            ? [
                `Morning: Hotel breakfast, pack bags, and check-out.`,
                `Afternoon: Private transfer to airport / station with wonderful memories!`
              ]
            : [
                `Morning: Breakfast at hotel. Sightseeing of major attractions in ${destination}.`,
                `Afternoon: Free time for shopping and exploring local markets.`,
                `Evening: Relaxing dinner at local cafe.`,
                `Stay: Premium Hotel in ${destination}.`
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
  // Add base inclusions that aren't duplicates
  const baseIncs = baseTemplate.inclusions || [
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
    `Check local weather forecasts before packing clothes for ${destination}.`
  ];

  return {
    destination,
    daysCount: numDays,
    tripType,
    agencyName: agencyName || "Your Trusted Travel Partner",
    phone,
    email,
    title: typeof baseTemplate.title === "function" ? baseTemplate.title(numDays) : `${destination} ${numDays}D/${Math.max(1, numDays - 1)}N Tour Package`,
    days: finalDays,
    inclusions: finalInclusions,
    exclusions: finalExclusions,
    tips
  };
}

/**
 * Converts structured itinerary object into formatted WhatsApp text with emojis & headers
 */
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

/**
 * Parses raw AI Markdown response into the unified editable structured itinerary object
 */
export function parseMarkdownToStructuredItinerary(text, meta = {}) {
  if (!text) return null;
  const lines = text.split("\n");
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
