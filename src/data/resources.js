/**
 * Hospitality Resource Exchange - Mock Dataset
 * 
 * High-fidelity inventory of shared hospitality assets across:
 * - Commercial Kitchen & Prep
 * - Venues & Spaces
 * - Commercial Equipment
 * - Event Supplies & Decor
 */

export const resources = [
  {
    id: "res-01",
    title: "Off-Peak Artisan Bakery & Pastry Kitchen",
    category: "Commercial Kitchen & Prep",
    hostBusiness: "The Artisan Loaf & Patisserie",
    location: "Indiranagar, Bengaluru",
    rate: 1800,
    rateUnit: "hour",
    availability: "Mon–Fri, 4:00 AM – 11:00 AM (Pre-opening slot)",
    description: "Fully certified commercial baking space with triple-deck stone hearth ovens, temperature-controlled dough sheeters, and dedicated pastry marble counters. Ideal for morning cloud-kitchen batches or wholesale patisserie production.",
    specs: [
      "3-Deck Roto-Deck Stone Hearth Oven",
      "60L Hobart Spiral Dough Mixer",
      "Temperature-controlled dough room (18°C)",
      "Walk-in proofing chamber",
      "3-Phase 32A industrial power supply"
    ],
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Valid FSSAI registration certificate required",
      "Kitchen crew must wear sanitized caps, aprons, and non-slip clogs",
      "Full workstation sanitize & mop before checkout"
    ],
    verified: true
  },
  {
    id: "res-02",
    title: "Cold Prep & Vacuum Packaging Station",
    category: "Commercial Kitchen & Prep",
    hostBusiness: "Olive Bar & Kitchen",
    location: "Bandra West, Mumbai",
    rate: 1200,
    rateUnit: "hour",
    availability: "Daily, 7:00 AM – 12:30 PM",
    description: "Dedicated refrigerated butchery and garde manger prep station equipped with Multivac chamber vacuum sealers, blast chillers, and commercial deli slicers. Perfect for sous-vide prep, butchery breakdown, and retail batch packaging.",
    specs: [
      "Ambient prep room maintained below 14°C",
      "Multivac C200 Chamber Vacuum Sealer",
      "Berkel 350mm Commercial Gravity Slicer",
      "Double deep prep sinks with foot-pedal mixer taps",
      "Stainless steel anti-microbial cutting surfaces"
    ],
    image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Strict raw meat vs vegetable prep board separation",
      "No unapproved personal blades or electrical gadgets",
      "Chemical sanitation wipe-down mandatory post session"
    ],
    verified: true
  },
  {
    id: "res-03",
    title: "10-Tray Commercial Shock Freezer / Blast Chiller",
    category: "Commercial Kitchen & Prep",
    hostBusiness: "ITC Grand Chola Culinary Wing",
    location: "Guindy, Chennai",
    rate: 800,
    rateUnit: "hour",
    availability: "Mon–Sat, 2:00 PM – 7:00 PM (Inter-service downtime)",
    description: "High-capacity Irinox commercial blast chiller capable of pulling core food temperature from +90°C down to -18°C in under 240 minutes. Ideal for caterers preparing bulk banquet items with strict HACCP compliance.",
    specs: [
      "10-Tray GN 1/1 capacity",
      "Irinox MultiFresh blast freezing cycles",
      "Multipoint core temperature probe",
      "HACCP data export via USB interface",
      "Heavy duty R452A eco refrigerant"
    ],
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "All containers must be pre-labeled with batch code and time",
      "Maximum load limit of 45kg per chilling cycle",
      "Supervision by duty sous-chef for initial setup"
    ],
    verified: true
  },
  {
    id: "res-04",
    title: "Skyline Rooftop Terrace & Cocktail Lounge",
    category: "Venues & Spaces",
    hostBusiness: "The Tamara Urban Luxury Hotel",
    location: "Koramangala, Bengaluru",
    rate: 45000,
    rateUnit: "day",
    availability: "Mon–Thu full day (Excluded on weekends & holidays)",
    description: "Breathtaking 4,500 sq.ft open-air terrace with panoramic city views, island bar counter, designer pergolas, and integrated warm architectural lighting. Ideal for brand activations, morning video shoots, or executive mixers.",
    specs: [
      "Capacity: 160 guests standing / 90 seated",
      "Dedicated high-speed service and freight elevators",
      "32A dedicated audio/lighting distribution box",
      "Retractable weather-resistant pergolas",
      "Private restrooms and green room attached"
    ],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Sound levels strictly limited to 65dB after 10:00 PM",
      "No open fire pits or unshielded charcoal grills",
      "Approved freestanding decor only; no wall or structural adhesives"
    ],
    verified: true
  },
  {
    id: "res-05",
    title: "Weekday Executive Ballroom & Pre-Function Space",
    category: "Venues & Spaces",
    hostBusiness: "Taj Lands End",
    location: "Bandra, Mumbai",
    rate: 35000,
    rateUnit: "day",
    availability: "Mon–Wed, 8:00 AM – 6:00 PM",
    description: "Pillar-less 3,200 sq.ft luxury ballroom featuring acoustic wood paneling, motorized 4K laser projection screens, concealed Bose line-array audio, and an exclusive pre-function foyer for guest reception.",
    specs: [
      "Capacity: 220 theatre / 120 cluster banquet seating",
      "Dual ceiling-mounted 4K Christie laser projectors",
      "Two private VIP breakout rooms included",
      "Independent freight dock access with ramp",
      "Valet parking allocation for up to 60 cars"
    ],
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Outside catering vendors require prior hotel hygiene accreditation",
      "Setup window opens 2 hours prior to scheduled start time",
      "Audio and electrical tie-ins must be coordinated with in-house engineers"
    ],
    verified: true
  },
  {
    id: "res-06",
    title: "Towable Mobile Cold Storage Refrigerated Trailer",
    category: "Commercial Equipment",
    hostBusiness: "Saffron Gourmet Catering & Logistics",
    location: "Aerocity, New Delhi",
    rate: 6500,
    rateUnit: "day",
    availability: "Available weekdays with 24-hour advance dispatch",
    description: "14-foot mobile temperature-controlled trailer capable of dual refrigeration (+2°C to +4°C) or deep freeze (-18°C). Operates on onboard silent diesel generator or standard 220V shore power hookup. Essential for large outdoor weddings and culinary festivals.",
    specs: [
      "Internal volume: 14ft length x 7ft width x 6.5ft height",
      "Carrier Transicold refrigeration unit",
      "Dual power: Built-in whisper-quiet generator + 220V 16A hookup",
      "Four-tier food-grade stainless steel shelving racks included",
      "Digital real-time temperature telemetry"
    ],
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Commercial driver license required for self-towage or optional driver fee",
      "Delivered pre-cooled to requested target temperature",
      "Refundable security deposit of ₹15,000 required before dispatch"
    ],
    verified: true
  },
  {
    id: "res-07",
    title: "Rational iCombi Pro 20-Tray Gas Combi Oven",
    category: "Commercial Equipment",
    hostBusiness: "Grand Hyatt Convention Kitchen",
    location: "Santacruz East, Mumbai",
    rate: 2400,
    rateUnit: "hour",
    availability: "Daily, 6:00 AM – 11:30 AM & 3:00 PM – 6:00 PM",
    description: "State-of-the-art Rational 20-tray GN 1/1 combi steamer oven with intelligent climate management, steam injection, and automated cleaning cycles. Handles steaming, roasting, baking, and re-thermalization at institutional scale.",
    specs: [
      "20 x GN 1/1 tray capacity (or 10 x GN 2/1)",
      "Piped Natural Gas (PNG) / LPG compatible",
      "CareControl intelligent descaling and self-cleaning",
      "Touchscreen programming with 1,200 recipe memory slots",
      "Integrated hand shower with automatic retract"
    ],
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Trained commercial culinary operator must supervise equipment use",
      "Only official Rational active green cleaner tabs permitted",
      "Inline water softening filter must remain engaged during steaming"
    ],
    verified: true
  },
  {
    id: "res-08",
    title: "Carpigiani Twin-Flavor Soft-Serve & Gelato Machine",
    category: "Commercial Equipment",
    hostBusiness: "Milano Gelateria & Dessert Lab",
    location: "Jubilee Hills, Hyderabad",
    rate: 4800,
    rateUnit: "day",
    availability: "Available for 1 to 5-day rentals with 48h notice",
    description: "Italian Carpigiani gravity-fed double-cylinder dessert freezer with independent cylinder refrigeration and pasteurization cycles. Ideal for pop-up dessert parlors, luxury weddings, or catering exhibitions.",
    specs: [
      "Dispensing speed: up to 480 portions (75g) per hour",
      "Twin flavor dispense + center twist combination",
      "Air-cooled condenser, standard 230V single-phase plug",
      "Independent hopper refrigeration maintains mix under 4°C",
      "Digital viscosity and overrun control"
    ],
    image: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Pre-delivery pasteurization cycle completed before handover",
      "Must be transported in upright vertical shock-mounted flight case",
      "Thorough wash and dry cycle mandatory prior to return pickup"
    ],
    verified: false
  },
  {
    id: "res-09",
    title: "Set of 150 Champagne Gold Chiavari Banquet Chairs",
    category: "Event Supplies & Decor",
    hostBusiness: "Royal Orchid Banquets & Events",
    location: "Old Airport Road, Bengaluru",
    rate: 5500,
    rateUnit: "day",
    availability: "Available Monday through Friday (Weekend blackout applies)",
    description: "Premium solid resin Chiavari banquet chairs in metallic champagne gold finish with high-density ivory velvet seat cushions. Scratch-resistant, lightweight, and weather-proof for luxury indoor ballrooms or lawn receptions.",
    specs: [
      "150 matching units with velcro-attached ivory cushions",
      "High-density virgin resin frame tested to 250kg static weight",
      "Stackable up to 8 chairs high with custom transport covers",
      "UV-stabilized resin will not chip, fade, or stain",
      "Includes 12 spare cushion replacements for event peace of mind"
    ],
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Chairs must be re-stacked in protective padded covers for return",
      "Broken or missing chair penalty: ₹1,200 per unit",
      "Hirer arranges vehicle transport or requests local delivery add-on"
    ],
    verified: true
  },
  {
    id: "res-10",
    title: "Complete Buffet Set: 24 Roll-Top Chafing Dishes & Warmers",
    category: "Event Supplies & Decor",
    hostBusiness: "Curators Hospitality & Catering Supplies",
    location: "Bhikaji Cama Place, New Delhi",
    rate: 3200,
    rateUnit: "day",
    availability: "Available daily for single or multi-day rental",
    description: "Commercial grade 18/10 stainless steel roll-top rectangular chafing units with 9L capacity, slow-close 90°/180° glass-window lids, and dual fuel canister holders. Includes magnetic induction heating adapters for indoor smoke-free buffets.",
    specs: [
      "24 matching mirror-polished stainless steel 9L units",
      "Integrated hydraulic soft-close lids with glass viewing panels",
      "Equipped with electric induction heat adapters & chafing gel holders",
      "Comes packed in 6 shock-resistant stackable road transport cases",
      "Includes 24 stainless steel serving tongs and ladle rests"
    ],
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1000&q=80",
    houseRules: [
      "Hand-wash with warm water and non-scratch sponges only",
      "Dry thoroughly before repacking in transport road cases",
      "Replacement fee applies for broken glass lids or dented chafers"
    ],
    verified: true
  }
];
