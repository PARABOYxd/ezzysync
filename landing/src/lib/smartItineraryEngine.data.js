/**
 * Smart Travel Itinerary Generator & Parser
 * Real-Data Knowledge Base covering All Over India and Popular International Circuits.
 * Features realistic transit routing (e.g. Delhi to Delhi), famous trending attractions,
 * authentic local food, stays, inclusions, and exclusions.
 */

// ==========================================
// 1. ALL-INDIA REAL DESTINATION DATA REGISTRY
// ==========================================
export const INDIA_DESTINATIONS_DATA = {
  // --- Uttarakhand ---
  almora: {
    name: "Almora",
    state: "Uttarakhand",
    spots: ["Bright End Corner sunset point", "Zero Point in Binsar Sanctuary", "Chitai Golu Devta Temple of Bells", "Jageshwar Dham 8th-century stone temple complex", "Kasar Devi Temple (Crank's Ridge)", "Lala Bazaar for copperware & Bal Mithai", "Katarmal Sun Temple"],
    activities: ["Tasting authentic Bal Mithai and Singauri sweets", "Bird watching amidst towering deodar forests", "Panoramic photography of Nanda Devi & Trishul peaks"],
    food: ["Authentic Kumaoni Thali with Bhatt ki Churkani and Mandua Roti", "Fresh Almora Bal Mithai"],
    stay: "Cozy Kumaoni Heritage Resort / Forest Retreat in Almora",
    route: "Drive via Hapur, Moradabad, Kathgodam, and Bhowali (approx. 360 km / 8 hrs)"
  },
  binsar: {
    name: "Binsar",
    state: "Uttarakhand",
    spots: ["Binsar Wildlife Sanctuary Zero Point", "Mary Budden Estate trails", "Khali Estate", "Bineshwar Mahadev Temple", "Golu Devta Temple", "Pari Devi Temple"],
    activities: ["300-km Himalayan panoramic view of Kedarnath, Shivling, Trisul & Nanda Devi", "Forest trekking under oak and rhododendron canopy", "Birdwatching (over 200 species)"],
    food: ["Kumaoni Gahat ki Dal", "Bhang ki Chutney", "Singodi sweet"],
    stay: "Serene Wilderness Resort inside Binsar Sanctuary",
    route: "Drive from Delhi via Kathgodam and Almora (approx. 380 km / 9 hrs)"
  },
  kausani: {
    name: "Kausani",
    state: "Uttarakhand",
    spots: ["Anasakti Ashram (Gandhi Ashram)", "Kausani Tea Estate", "Rudradhari Falls and Caves", "Baijnath ancient stone temples", "Sumitranandan Pant Gallery", "Sunset Point overlooking Trishul peak"],
    activities: ["Watching golden Himalayan sunrise over Nanda Devi & Panchachuli", "Strolling through terraced organic tea gardens", "Exploring 12th-century stone carvings at Baijnath"],
    food: ["Bal Mithai", "Kumaoni Raita with yellow mustard", "Madua Roti"],
    stay: "Himalayan Panorama Resort in Kausani",
    route: "Drive via Kathgodam, Almora / Someshwar (approx. 400 km / 9.5 hrs)"
  },
  ranikhet: {
    name: "Ranikhet",
    state: "Uttarakhand",
    spots: ["Chaubatia Apple Orchards", "Jhula Devi Temple with hundreds of brass bells", "Ranikhet Golf Course (Upat Golf Course)", "Majkhali viewpoint", "Kumaon Regimental Centre Museum", "Bhalu Dam"],
    activities: ["Golfing at high-altitude 9-hole army golf course", "Plucking seasonal fresh apples and peaches in Chaubatia", "Nature walks through pine and deodar forests"],
    food: ["Fresh rhododendron juice (Buransh)", "Kumaoni Dubke", "Aloo ke Gutke"],
    stay: "Colonial Heritage Hotel / Pine Wood Cottage in Ranikhet",
    route: "Drive via Kathgodam and Bhowali (approx. 350 km / 8 hrs)"
  },
  mukteshwar: {
    name: "Mukteshwar",
    state: "Uttarakhand",
    spots: ["Mukteshwar Dham 350-year-old Shiva Temple", "Chauli Ki Jali rocky cliff", "Bhalu Gaad Waterfall", "Methodist Church", "Renewable Energy Park", "Sitla pine ridge"],
    activities: ["Rock climbing and rappelling at Chauli Ki Jali", "Trek to hidden Bhalu Gaad Waterfall with natural pools", "Star-gazing under pollution-free mountain skies"],
    food: ["Garhwali/Kumaoni Kafuli", "Fresh fruit jams and chutneys", "Hot Pahadi Chai"],
    stay: "Cliffside Boutique Cottage overlooking snow peaks in Mukteshwar",
    route: "Drive from Delhi via Kathgodam and Bhimtal (approx. 340 km / 7.5 hrs)"
  },
  dhanaulti: {
    name: "Dhanaulti & Kanatal",
    state: "Uttarakhand",
    spots: ["Eco Park (Amber and Dhara)", "Surkanda Devi Temple (Hilltop ropeway at 9,000 ft)", "Kanatal pine forests", "Tehri Dam reservoir water sports", "Camp Thangdhar", "Apple Orchard Farm"],
    activities: ["Ropeway ride to Surkanda Devi with 360-degree Himalayan views", "Jet skiing and banana boat ride at Tehri Lake", "Forest camping with evening bonfire"],
    food: ["Pahadi Dal Makhani", "Garhwali Jhangora Kheer", "Steaming momos"],
    stay: "Cozy Wooden Pine Cottage / Swiss Alpine Tent in Dhanaulti",
    route: "Drive from Delhi via Dehradun / Mussoorie bypass (approx. 300 km / 7 hrs)"
  },
  chakrata: {
    name: "Chakrata",
    state: "Uttarakhand",
    spots: ["Tiger Falls (cascading 312 ft)", "Chilmiri Neck sunset viewpoint", "Budher Caves & Moila Danda meadow", "Deoban high-altitude deodar forest (9,800 ft)", "Ram Tal Horticultural Garden", "Kanasar deodar groove"],
    activities: ["Hike down to magnificent Tiger Falls for a cool splash", "Exploring ancient limestone Budher caves", "Bird watching among the thickest deodar trees in Asia"],
    food: ["Local Jaunsari cuisine", "Hot Maggi and local herbal tea at viewpoints", "Pahadi mutton / paneer"],
    stay: "Rustic Mountain Lodge / Camp in Chakrata",
    route: "Drive via Saharanpur and Vikasnagar (approx. 315 km / 7.5 hrs)"
  },
  lansdowne: {
    name: "Lansdowne",
    state: "Uttarakhand",
    spots: ["Tip-In-Top (Tiffin Top) viewpoint", "Bhulla Tal Lake boating", "St. John's and St. Mary's colonial churches", "Garhwal Rifles Regimental Museum", "Darwan Singh Sanghralaya", "Tarkeshwar Mahadev Temple surrounded by cedar woods"],
    activities: ["Boating in paddle boats on Bhulla Tal Lake", "Quiet pine forest heritage walks", "Visiting 100-year-old British military churches"],
    food: ["Garhwali Chainsoo", "Authentic Bun-Omelette at Gandhi Chowk", "Pahadi Chai"],
    stay: "Colonial Style Cantonment Resort in Lansdowne",
    route: "Drive via Meerut, Kotdwar, and Dugadda (approx. 250 km / 6 hrs from Delhi)"
  },
  tehri: {
    name: "Tehri & New Tehri",
    state: "Uttarakhand",
    spots: ["Tehri Dam (Asia's tallest dam 260.5 m)", "Tehri Lake floating huts and water sports", "Koti Colony promenade", "Dobra Chanti Bridge (India's longest motorable single-lane suspension bridge)", "Chandrabadani Temple"],
    activities: ["Speed boating, jet skiing, surfing, and kayaking in emerald Tehri Lake", "Walking on illuminated Dobra Chanti suspension bridge", "Paragliding over Tehri reservoir"],
    food: ["Local Tehri river fish curry", "Garhwali Thali", "Local sweets"],
    stay: "Luxury Floating Huts on Tehri Lake / Lakeview Resort",
    route: "Drive via Rishikesh and Chamba (approx. 290 km / 6.5 hrs from Delhi)"
  },

  // --- Himachal Pradesh ---
  chail: {
    name: "Chail",
    state: "Himachal Pradesh",
    spots: ["Chail Palace (built by Maharaja of Patiala in 1891)", "World's Highest Cricket Ground (at 7,380 ft)", "Chail Wildlife Sanctuary", "Sadhupul River Park", "Kali Ka Tibba hilltop temple", "Gurudwara Sahib"],
    activities: ["Touring grand royal antique rooms of Chail Palace", "Dipping feet in shallow mountain waters at Sadhupul", "Catching golden hour over Shivalik ranges at Kali Ka Tibba"],
    food: ["Himachali Madra", "Apple cider", "Siddu with hot ghee"],
    stay: "Royal Heritage Chail Palace / Pine Cottage",
    route: "Drive via Himalayan Expressway, Kandaghat (approx. 335 km / 7 hrs from Delhi)"
  },
  kasauli: {
    name: "Kasauli",
    state: "Himachal Pradesh",
    spots: ["Gilbert Trail nature walk", "Sunset Point & Lover's Lane", "Monkey Point (Manki Point) Hanuman temple", "Christ Church built in 1853", "Mall Road and Heritage Market", "Kasauli Brewery"],
    activities: ["Walking the scenic 1.5 km cliffside Gilbert Trail amidst pines", "Shopping for fruit wines and jams on Upper Mall", "Photography of Sutlej river glittering in the distance"],
    food: ["Himachali Bun Samosa at Narinder Sweet House", "Tibetan momos and Thukpa", "Local plum and peach wine"],
    stay: "Victorian Style Heritage Resort in Kasauli",
    route: "Drive from Delhi via Ambala and Kalka (approx. 285 km / 5.5 hrs)"
  },
  palampur: {
    name: "Palampur & Kangra Valley",
    state: "Himachal Pradesh",
    spots: ["Palampur Tea Gardens and Factory", "Neugal Khad suspension bridge", "Saurabh Van Vihar", "Baijnath Shiva Temple (1204 AD)", "Andretta Pottery & Artists' Village", "Chamunda Devi Temple", "Kangra Fort"],
    activities: ["Hands-on pottery making at historic Andretta Village", "Tasting fresh Kangra Green Tea at tea plantations", "Exploring ancient rock architecture of Baijnath temple"],
    food: ["Authentic Kangri Dham feast served on leaf plates", "Khatta meat / paneer", "Siddu with walnut stuffing"],
    stay: "Lush Tea Estate Heritage Resort in Palampur",
    route: "Drive via Chandigarh, Una, Kangra (approx. 470 km / 9 hrs)"
  },
  tirthan: {
    name: "Tirthan Valley & Shoja",
    state: "Himachal Pradesh",
    spots: ["Tirthan River pristine trout stream", "Great Himalayan National Park (UNESCO)", "Choie Waterfall", "Jalori Pass (10,800 ft)", "Serolsar Lake sacred trek", "Chehni Kothar tower temple", "Shoja viewpoint"],
    activities: ["Angling and fly-fishing for Himalayan Brown & Rainbow Trout", "Trek to sacred emerald Serolsar Lake through oak forests", "Camping alongside crystal-clear Tirthan river"],
    food: ["Freshly cooked Himalayan Trout fish", "Siddu with mint chutney", "Local apple crumble"],
    stay: "Cozy Riverside Wooden Cottage / Eco-Lodge in Tirthan Valley",
    route: "Drive via Mandi and Aut Tunnel towards Banjar (approx. 490 km / 10 hrs from Delhi)"
  },
  kinnaur: {
    name: "Kinnaur, Kalpa & Chitkul",
    state: "Himachal Pradesh",
    spots: ["Chitkul (Last inhabited village on Indo-Tibet border)", "Baspa River banks in Sangla Valley", "Kamru Fort in Sangla", "Kalpa village with views of Kinner Kailash (6,050 m)", "Suicide Point Roghi", "Reckong Peo market"],
    activities: ["Photographing the sacred Kinner Kailash peak changing colors at sunrise", "Walking through world-famous Kinnauri apple orchards", "Sitting by the crystal turquoise Baspa river in Chitkul"],
    food: ["Kinnauri Rajma with local red rice", "Chilgoza (pine nuts)", "Ogla and Fafra pancakes"],
    stay: "Apple Orchard Retreat / Wooden Cottages in Kalpa & Sangla",
    route: "Drive via Shimla, Narkanda, Rampur along Hindustan-Tibet road (approx. 560 km / 14 hrs)"
  },
  birbilling: {
    name: "Bir Billing",
    state: "Himachal Pradesh",
    spots: ["Billing Paragliding Takeoff Point (8,000 ft)", "Bir Paragliding Landing Site (Chaugan)", "Chokling Monastery", "Sherab Ling Monastery", "Dharmalaya Institute", "Bir Tibetan Colony cafes", "Baijnath Temple"],
    activities: ["Tandem Paragliding flight from Billing to Bir (15-30 mins)", "Mountain biking through tea garden trails", "Cafe hopping and enjoying Tibetan butter tea and tingling Thukpa"],
    food: ["Tibetan Tingmo with spicy curry", "Wood-fired pizza at Garden Cafe", "Authentic Mokthuk"],
    stay: "Trendy Eco-Resort / Paragliding Camp in Bir",
    route: "Drive via Chandigarh, Mandi, Baijnath (approx. 480 km / 10 hrs from Delhi)"
  },

  // --- Rajasthan & Gujarat ---
  mountabu: {
    name: "Mount Abu",
    state: "Rajasthan",
    spots: ["Dilwara Jain Temples (world-renowned marble carvings)", "Nakki Lake boating and Toad Rock", "Guru Shikhar (highest peak of Aravalli range at 5,650 ft)", "Sunset Point", "Achalgarh Fort", "Peace Park Brahma Kumaris"],
    activities: ["Admiring breathtaking 11th-century marble filigree at Dilwara", "Evening pedal boating around scenic Nakki Lake", "Watching sunset over Aravalli hills with hot roasted corn"],
    food: ["Dal Baati Churma", "Gawarphali ki Sabzi", "Rabri and Malpua"],
    stay: "Colonial Heritage Hotel / Lake View Resort in Mount Abu",
    route: "Drive from Ahmedabad (225 km / 4.5 hrs) or Udaipur (165 km / 3 hrs)"
  },
  bikaner: {
    name: "Bikaner",
    state: "Rajasthan",
    spots: ["Junagarh Fort (unconquered desert fort)", "Karni Mata Temple Deshnoke (Famous Temple of Rats)", "National Research Centre on Camel", "Lalgarh Palace and Museum", "Rampuria Haveli street walk", "Gajner Palace & Lake"],
    activities: ["Sampling camel milk ice cream at Asia's only camel breeding farm", "Walking through red sandstone carved Rampuria Havelis", "Desert camel safari on Sand Dunes"],
    food: ["World-famous Bikaneri Bhujia", "Ghevar", "Bikaneri Rasgulla", "Ker Sangri"],
    stay: "Palatial Heritage Haveli / Royal Palace in Bikaner",
    route: "Drive via Jaipur (330 km / 5.5 hrs) or Jodhpur (250 km / 4.5 hrs)"
  },
  ranthambore: {
    name: "Ranthambore",
    state: "Rajasthan",
    spots: ["Ranthambore National Park (Zone 1 to 10)", "UNESCO Ranthambore Fort atop cliff", "Trinetra Ganesh Temple", "Padam Talao & Rajbagh Lake", "Jogi Mahal", "Surwal Lake birdwatching"],
    activities: ["Thrilling Morning & Afternoon 4x4 Jeep/Canter Tiger Safari", "Hiking up to historic Ranthambore Fort with bird's-eye jungle views", "Spotting marsh crocodiles and sambar deer at Padam Talao"],
    food: ["Rajasthani Laal Maas", "Missi Roti with homemade white butter", "Churma"],
    stay: "Luxury Jungle Safari Lodge / Heritage Resort in Sawai Madhopur",
    route: "Drive from Delhi via Mumbai Expressway (approx. 360 km / 5.5 hrs) or Jaipur (160 km / 3 hrs)"
  },
  kumbhalgarh: {
    name: "Kumbhalgarh & Ranakpur",
    state: "Rajasthan",
    spots: ["Kumbhalgarh Fort (Great Wall of India - 36 km long wall)", "Badal Mahal (Palace of Clouds)", "Ranakpur Jain Temple (1,444 uniquely carved marble pillars)", "Kumbhalgarh Wildlife Sanctuary", "Vedi Temple"],
    activities: ["Walking on the world's 2nd longest continuous wall after Great Wall of China", "Witnessing grand evening Sound & Light Show at Kumbhalgarh Fort", "Marveling at the intricate marble architecture of Ranakpur"],
    food: ["Traditional Mewari Thali", "Panchkuta sabzi", "Gatte ki Khichdi"],
    stay: "Fort View Luxury Heritage Resort in Kumbhalgarh",
    route: "Drive from Udaipur (85 km / 2 hrs) or Jodhpur (170 km / 3.5 hrs)"
  },
  diu: {
    name: "Diu & Somnath",
    state: "Gujarat",
    spots: ["Nagoa Beach (horseshoe shaped beach)", "Diu Fort surrounded by sea on three sides", "Naida Caves (dramatic sunlit limestone caves)", "St. Paul's Portuguese Church", "Gangeshwar Mahadev Temple sea-facing Shivlingas", "Somnath Jyotirlinga Temple (75 km)"],
    activities: ["Watersports at Nagoa beach (parasailing, jet ski)", "Photography through sun-beamed archways of Naida Caves", "Evening Darshan and Light & Sound show at Somnath Temple"],
    food: ["Fresh coastal seafood", "Gujarati Thali with Kadhi & Khichdi", "Fafda Jalebi"],
    stay: "Sea-Facing Beach Resort in Diu",
    route: "Drive from Rajkot (230 km / 5 hrs) or Ahmedabad (360 km / 7 hrs)"
  },
  gir: {
    name: "Sasan Gir (Gir National Park)",
    state: "Gujarat",
    spots: ["Gir National Park & Wildlife Sanctuary (only home of Asiatic Lions)", "Devalia Safari Park (Gir Interpretation Zone)", "Kamleshwar Dam (crocodile breeding lake)", "Kankai Mata Temple inside forest", "Somnath Temple (45 km)"],
    activities: ["Open Gypsy Lion Safari tracking pride of wild Asiatic Lions", "Spotting leopards, spotted deer (chital), and 300+ bird species", "Learning local Maldhari pastoralist culture and wildlife coexistence"],
    food: ["Kathiyawadi Thali with Bajra No Rotlo, Ringna No Olo, and fresh Chhach", "Sev Tameta"],
    stay: "Wilderness Safari Resort / Luxury Tented Camp in Sasan Gir",
    route: "Drive from Rajkot (160 km / 3.5 hrs) or Junagadh (55 km / 1 hr)"
  },

  // --- Central India ---
  pachmarhi: {
    name: "Pachmarhi",
    state: "Madhya Pradesh",
    spots: ["Bee Falls (cascading 150 ft stream)", "Dhoopgarh (highest point of Satpura range at 4,429 ft)", "Jata Shankar Cave temple", "Pandav Caves", "Handi Khoh 300-ft deep canyon", "Silver Fall (Rajat Prapat)", "Chauragarh Peak"],
    activities: ["Bathing in natural plunge pools beneath Bee Falls", "Watching spectacular sunset from Dhoopgarh peak", "Trekking to Chauragarh temple carrying trishuls"],
    food: ["Bhutte ka Kees", "Poha Jalebi", "Dal Bafla with hot ghee"],
    stay: "Colonial British Heritage Hotel / MP Tourism Resort in Pachmarhi",
    route: "Drive from Bhopal (200 km / 4.5 hrs) or Nagpur (260 km / 5.5 hrs)"
  },
  khajuraho: {
    name: "Khajuraho",
    state: "Madhya Pradesh",
    spots: ["Western Group of Temples (Kandariya Mahadeva, Lakshmana Temple)", "Eastern Group (Parsvanatha, Ghantai Temple)", "Southern Group (Duladeo Temple)", "Raneh Falls canyon & gharial sanctuary", "Sound and Light Show", "Panna National Park (Tiger reserve 30 km)"],
    activities: ["Guided architectural walk through UNESCO 10th-century Chandela temples", "Watching the dramatic granite canyon and waterfalls of Raneh Falls", "Ken River boat ride for gharials and migratory birds"],
    food: ["Bundelkhandi cuisine", "Mawa Bati", "Rogan Josh and local Korma"],
    stay: "Luxury Heritage Resort with landscaped gardens in Khajuraho",
    route: "Connected via Khajuraho Airport or drive from Jhansi (175 km / 3.5 hrs)"
  },
  ujjain: {
    name: "Ujjain & Omkareshwar",
    state: "Madhya Pradesh",
    spots: ["Mahakaleshwar Jyotirlinga (Bhasma Aarti)", "Shri Mahakal Mahalok Corridor", "Ram Ghat Shipra River evening Aarti", "Kal Bhairav Temple", "Harsiddhi Temple (Shaktipeeth)", "Omkareshwar Island Jyotirlinga on Narmada River (140 km)", "Mamleshwar Temple"],
    activities: ["Attending sacred 04:00 AM Bhasma Aarti at Mahakaleshwar", "Walking through the 900-meter grand Mahakal Lok corridor", "Taking boat parikrama of Om-shaped island in Omkareshwar"],
    food: ["Ujjaini Poha Jalebi with Sev", "Dal Bafla", "Malwa Rabri and Garadu"],
    stay: "Deluxe Heritage Hotel near Mahakal Corridor in Ujjain",
    route: "Drive from Indore Airport (55 km / 1 hr) via smooth 4-lane highway"
  },

  // --- South India ---
  chikmagalur: {
    name: "Chikmagalur",
    state: "Karnataka",
    spots: ["Mullayanagiri (Karnataka's highest peak at 1,930 m)", "Baba Budangiri holy shrine", "Hebbe Falls cascading inside coffee estates", "Z Point Kemmangundi trek", "Jhari / Buttermilk Waterfalls", "Hirekolale Lake sunset", "Bhadra Wildlife Sanctuary"],
    activities: ["Guided walk through aromatic Arabica & Robusta coffee plantations", "Jeep safari to hidden waterfalls and streams", "Catching golden sunrise from Mullayanagiri peak"],
    food: ["Authentic Malnad cuisine with Akki Roti, Kaayi Kadabu and fresh filter coffee", "Bhende pulimunchi"],
    stay: "Serene Coffee Estate Homestay / Luxury Plantation Resort in Chikmagalur",
    route: "Scenic highway drive from Bangalore via Hassan (approx. 240 km / 4.5 hrs)"
  },
  wayanad: {
    name: "Wayanad",
    state: "Kerala",
    spots: ["Banasura Sagar Dam (largest earthen dam in India)", "Edakkal Caves (prehistoric Stone Age petroglyphs)", "Chembra Peak & heart-shaped love lake", "Soochipara & Meenmutty Waterfalls", "Pookode freshwater Lake boating", "Kuruva Island bamboo rafting", "Muthanga Wildlife Sanctuary"],
    activities: ["Trek to Chembra Peak heart lake through misty tea gardens", "Bamboo rafting across Kabini river tributaries at Kuruva Dweep", "Zip-lining across emerald valleys"],
    food: ["Kerala Sadya with Malabar Parotta and Chemmeen (Prawn) Curry", "Appam with stew", "Puttu and Kadala curry"],
    stay: "Luxury Rainforest Treehouse / Plantation Resort in Wayanad",
    route: "Drive from Calicut / Kozhikode Airport (85 km / 2.5 hrs) or Bangalore (280 km / 6 hrs)"
  },
  kodaikanal: {
    name: "Kodaikanal (Princess of Hill Stations)",
    state: "Tamil Nadu",
    spots: ["Kodaikanal Lake (star-shaped lake cycling & boating)", "Coaker's Walk cliffside promenade", "Pillar Rocks (three vertical granite boulders 400 ft high)", "Bryant Park floral nursery", "Silver Cascade Waterfall", "Pine Forest", "Guna Caves (Devil's Kitchen)", "Dolphin's Nose viewpoint"],
    activities: ["Cycling around the perimeter of scenic Kodai Lake", "Walking through misty pine forests and Eucalyptus groves", "Admiring sunset from Coaker's Walk with views of Vaigai Dam"],
    food: ["Handmade chocolates from Kodai bazaars", "Authentic South Indian filter coffee", "Piping hot bread omelette and sweet corn"],
    stay: "Colonial Stone Cottage / Lakeview Resort in Kodaikanal",
    route: "Drive from Madurai Airport (120 km / 3 hrs) or Coimbatore (170 km / 4.5 hrs)"
  },
  varkala: {
    name: "Varkala & Kovalam",
    state: "Kerala",
    spots: ["Varkala North Cliff Beach (red laterite cliffs over Arabian Sea)", "Janardhanaswamy 2,000-year-old Temple", "Papanasam Beach holy spring waters", "Odayam & Black Sand Beach", "Kovalam Lighthouse Beach", "Jatayu Earth's Center (world's largest bird sculpture 35 km)"],
    activities: ["Cliffside cafe hopping with ocean views and acoustic music", "Surfing lessons and yoga sessions at Varkala beach", "Visiting colossal Jatayu sculpture via scenic cable car"],
    food: ["Fresh catch grilled fish and tiger prawns", "Kerala Banana Fritters (Pazham Pori)", "Tender coconut water and Ayurvedic herbal tea"],
    stay: "Cliffside Oceanfront Boutique Resort in Varkala",
    route: "Drive from Trivandrum Airport (45 km / 1 hr)"
  },
  rameshwaram: {
    name: "Rameshwaram & Kanyakumari",
    state: "Tamil Nadu",
    spots: ["Ramanathaswamy Temple (Longest temple corridor in world with 1,212 pillars & 22 holy kunds)", "Pamban Bridge rail and road sea crossing", "Dhanushkodi Ghost Town & Ram Setu viewpoint (Arichal Munai)", "Agni Theertham", "Dr. APJ Abdul Kalam National Memorial", "Kanyakumari Vivekananda Rock Memorial & Thiruvalluvar Statue (3 hrs)"],
    activities: ["Bathing in 22 sacred well teerthams inside Ramanathaswamy Temple", "Scenic 4x4 drive to edge of land at Dhanushkodi where Bay of Bengal meets Indian Ocean", "Crossing the historic sea-spanning Pamban Bridge"],
    food: ["Traditional Tamil Banana Leaf Meals", "Kothu Parotta", "Filter Coffee and fresh coastal crab curry"],
    stay: "Temple View Deluxe Hotel / Coastal Resort in Rameshwaram",
    route: "Drive from Madurai (170 km / 3 hrs) or direct train across Pamban Bridge"
  },
  dandeli: {
    name: "Dandeli",
    state: "Karnataka",
    spots: ["Kali River white water rafting", "Dandeli Wildlife Sanctuary", "Syntheri Rocks monolithic granite formation", "Supa Dam reservoir", "Shiroli Peak sunset view", "Cavala Caves"],
    activities: ["Grade III River Rafting and Kayaking in Kali River", "Jungle canopy walk and Hornbill birdwatching", "Night jungle safari spotting black panthers and spotted deer"],
    food: ["North Karnataka Jolada Roti with Ennegayi (stuffed brinjal)", "Fresh river fish fry", "Dharwad Pedha"],
    stay: "Riverfront Jungle Safari Camp / Treehouse Resort in Dandeli",
    route: "Drive from Hubli Airport (75 km / 2 hrs) or Goa (120 km / 3 hrs)"
  },
  kabini: {
    name: "Kabini & Bandipur",
    state: "Karnataka",
    spots: ["Nagarhole National Park (Kabini wildlife reserve)", "Kabini River Boat Safari", "Bandipur Tiger Reserve", "Gopalaswamy Betta hilltop temple", "Balle Elephant Camp", "Taraka Dam"],
    activities: ["Boat Safari along Kabini backwaters spotting herd of 50+ elephants and marsh crocodiles", "Jeep safari tracking black leopards, tigers, and Indian dhole packs", "Coracle boat ride on forest fringes"],
    food: ["Kodava Pork curry (Pandhi Curry)", "Bamboo shoot curry", "South Indian buffet feast"],
    stay: "Luxury Safari Lodge along Kabini River / Wilderness Eco-Resort",
    route: "Drive from Mysore (80 km / 2 hrs) or Bangalore (220 km / 4.5 hrs)"
  },

  // --- East & North-East India ---
  puri: {
    name: "Puri & Konark",
    state: "Odisha",
    spots: ["Shree Jagannath Temple (Char Dham)", "Golden Beach (Blue Flag certified beach)", "Konark Sun Temple (UNESCO 13th-century chariot architecture)", "Chandrabhaga Beach", "Chilika Lake Satapada (Irrawaddy dolphin boat safari)", "Raghurajpur Heritage Pattachitra artisan village"],
    activities: ["Witnessing evening flag changing ceremony atop Jagannath Temple", "Boat safari on Chilika Lake to spot leaping Irrawaddy dolphins", "Walking on golden sands of Chandrabhaga beach during sunrise"],
    food: ["Mahaprasad from Jagannath Temple Anand Bazar", "Chhena Poda (baked cottage cheese cake)", "Fresh Chilika crab & prawn curry"],
    stay: "Sea-Facing Luxury Resort on Marine Drive, Puri",
    route: "Drive from Bhubaneswar Airport (60 km / 1.5 hrs) along smooth 4-lane highway"
  },
  tawang: {
    name: "Tawang & Bomdila",
    state: "Arunachal Pradesh",
    spots: ["Tawang Monastery (India's largest Buddhist monastery built in 1680)", "Sela Pass & frozen Sela Lake (13,700 ft)", "Madhuri Lake (Sangetsar Tso)", "Nuranang Falls (Bap Teng Kang 100-meter fall)", "Jaswant Garh War Memorial", "Bum La Pass (Indo-China border at 15,200 ft)"],
    activities: ["Spinning giant prayer wheels inside gilded Tawang Monastery", "Crossing snow-clad Sela Pass flanked by Buddhist prayer flags", "Boating in crystal turquoise Sangetsar Lake"],
    food: ["Authentic Monpa cuisine with Thukpa, Momos, and Zan", "Yak butter tea", "Gyapa Khazi"],
    stay: "Cozy Himalayan Wooden Lodge / Boutique Hotel in Tawang",
    route: "Drive via Tezpur, Bhalukpong, Bomdila, Dirang (Inner Line Permit required)"
  },
  kaziranga: {
    name: "Kaziranga National Park",
    state: "Assam",
    spots: ["Kaziranga Central (Kohora) & Western (Bagori) Safari Zones", "Kaziranga National Orchid and Biodiversity Park", "Brahmaputra river dolphin boating at Silghat", "Kakochang Waterfalls", "Hathikuli Tea Estate"],
    activities: ["Early morning Elephant Safari getting up close to Great One-Horned Rhinoceros", "Jeep safari spotting Royal Bengal Tigers, wild water buffaloes, and swamp deer", "Watching 500+ indigenous orchid species and Assamese Bihu folk dance"],
    food: ["Assamese Thali with Khar, Masor Tenga (tangy fish curry), and Joha rice", "Pitha sweets"],
    stay: "Eco-Friendly Jungle Safari Resort near Kohora Gate, Kaziranga",
    route: "Drive from Guwahati Airport (220 km / 4.5 hrs) or Jorhat (90 km / 2 hrs)"
  },

  // --- Maharashtra & Sahyadri Treks ---
  harishchandragad: {
    name: "Harishchandragad",
    state: "Maharashtra",
    spots: ["Kokankada sheer vertical concave cliff", "Kedareshwar Cave with water-submerged Shiva Lingam", "Harishchandreshwar 6th-century stone-carved temple", "Taramati Peak (highest point on the fort)", "Saptateertha Pushkarni sacred pond", "Paachnai base village trail"],
    activities: ["Trekking the historic Paachnai / Khireshwar trail with forest guide", "Witnessing the rare Broken Spectre optical illusion at Kokankada cliff edge", "Sunset over the Konkan horizon", "Stargazing and tent camping under clear Sahyadri night skies"],
    food: ["Authentic Maharashtrian Pitla Bhakri with spicy Thecha", "Fresh village Kanda Bhajji and hot ginger chai"],
    stay: "Cliffside Alpine Tents / Rustic Village Guesthouse on Harishchandragad Plateau",
    route: "Drive from Mumbai / Pune via Kalyan-Malshej Ghat or Igatpuri to Paachnai base village (approx. 160 km / 4.5 hrs)"
  },
  kalsubai: {
    name: "Kalsubai Peak",
    state: "Maharashtra",
    spots: ["Highest Peak of Maharashtra (5,400 ft summit)", "Kalsubai Mata Temple with prayer bells", "Bari base village", "Steel ladder rock sections", "Arthur Lake & Wilson Dam view", "Windy ridge trail"],
    activities: ["Climbing the iconic vertical steel ladders on sheer basalt rock faces", "Catching the golden sunrise cloud inversion from the summit", "360-degree panoramic vista of Bhandardara and surrounding forts"],
    food: ["Village Pitla Bhakri", "Desi Zunka", "Sweet Jaggery Chai"],
    stay: "Rustic Village Homestay or Lakeside Campsite in Bari / Bhandardara",
    route: "Drive from Mumbai via NH-160 / Igatpuri to Bari village (approx. 150 km / 3.5 hrs)"
  },
  aadrai: {
    name: "Aadrai Jungle Trek",
    state: "Maharashtra",
    spots: ["Khireshwar base village", "Aadrai hidden waterfall plunge pool", "Dense Malshej rainforest canopy", "Caves of Kalu gorge viewpoint", "Ancient stone Shiva temple", "Forest streams"],
    activities: ["Trekking through misty primeval rainforest canopy with knee-deep stream crossings", "Natural swimming and freshwater dip in Aadrai forest waterfall pool", "Spotting Malabar giant squirrels and wild Sahyadri flora"],
    food: ["Local Maharashtrian vegetarian thali with Bhakri and Thecha", "Hot piping Maggi and tea at base huts"],
    stay: "Jungle Camp or Homestay in Khireshwar near Malshej Ghat",
    route: "Drive from Mumbai via Kalyan, Murbad, and Malshej Ghat to Khireshwar (approx. 135 km / 3.5 hrs)"
  },
  devkund: {
    name: "Devkund Waterfall",
    state: "Maharashtra",
    spots: ["Devkund turquoise plunge pool", "Bhira Dam reservoir backwaters", "Dense Tamhini forest trail", "Riverbed boulder crossings", "Plus Valley viewpoint"],
    activities: ["Trek along scenic riverbed through dense Tamhini Ghat jungle", "Cliffside view of the cascading origin plunge pool", "Kayaking and lakeside relaxation at Bhira backwaters"],
    food: ["Maharashtrian Poha and Upma", "Traditional village lunch with fresh Bhakri and Thecha"],
    stay: "Lakeside Glamping Tents or Riverside Resort in Kolad / Tamhini",
    route: "Drive from Mumbai via Mumbai-Pune Expressway & Khopoli-Pali road to Bhira (approx. 130 km / 3.5 hrs)"
  },
  sandhan: {
    name: "Sandhan Valley",
    state: "Maharashtra",
    spots: ["Valley of Shadows (200 ft deep natural rock canyon)", "Samrad base village", "Reverse waterfall viewpoint", "Rock rappelling patches", "Alang-Madan-Kulang view"],
    activities: ["Trekking through narrow water-carved volcanic rock canyon where sun barely touches the ground", "Technical rock rappelling down water gorges", "Camping under million stars on canyon bed"],
    food: ["Samrad village home-cooked Thali", "Campfire barbecue"],
    stay: "Canyon Bed Tents or Samrad Village Homestay",
    route: "Drive from Mumbai via Kasara & Igatpuri to Samrad village (approx. 180 km / 4.5 hrs)"
  }
};

// Map lowercase lookup keys for the registry
const INDIAN_REGISTRY_LOOKUP = {};
for (const key of Object.keys(INDIA_DESTINATIONS_DATA)) {
  INDIAN_REGISTRY_LOOKUP[key] = INDIA_DESTINATIONS_DATA[key];
  const noSpace = key.replace(/\s+/g, "");
  if (noSpace !== key) INDIAN_REGISTRY_LOOKUP[noSpace] = INDIA_DESTINATIONS_DATA[key];
}

// Function to lookup real data for any Indian destination
export function getIndianDestinationRealData(destName = "", command = "") {
  if (!destName && !command) return null;
  const combined = `${destName} ${command}`.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  // Direct key check
  for (const k of Object.keys(INDIAN_REGISTRY_LOOKUP)) {
    const reg = new RegExp(`\\b${k}\\b`, "i");
    if (reg.test(combined)) {
      return INDIAN_REGISTRY_LOOKUP[k];
    }
  }
  return null;
}
