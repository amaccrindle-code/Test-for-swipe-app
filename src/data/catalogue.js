/* ────────────────────────────────────────────────────────────
   Everything a flat needs, one product type per line.

   Rules this list follows, because breaking them is what produced the
   bad results before:

   - One product per item. "Serving dishes and a water jug" was two
     things competing for one card, so it became plates. It is now two
     items. Same for prep kit and scales, and the smoke alarm and fire
     blanket.
   - The query reads like something you would type into a shop's search
     box, not a product name. "floor lamp", not "HEKTAR Floor lamp".
   - Price targets are what each tier realistically costs in 2026, not
     what you hope to pay. The scraper uses them to keep tiers apart.

   Order is roughly the order you would tackle a move in: the rooms you
   cannot live without first.
   ──────────────────────────────────────────────────────────── */

import { cat } from "./model.js";

export const CATEGORIES = [
  /* ── Kitchen: cooking ─────────────────────────────────────── */
  cat("pans-saucepan-set", "Kitchen", "Saucepan set", "Three sizes covers almost everything.", "stainless steel saucepan set", [35, 95, 240]),
  cat("pans-frying", "Kitchen", "Frying pan", "28cm is the useful everyday size.", "non stick frying pan 28cm", [15, 40, 110]),
  cat("pans-wok", "Kitchen", "Wok", "Worth having if you stir fry at all.", "wok non stick", [18, 45, 120]),
  cat("pans-stockpot", "Kitchen", "Stockpot", "Pasta, stock, big batches.", "stockpot large lidded", [22, 55, 140]),
  cat("pans-casserole", "Kitchen", "Casserole dish", "Cast iron if the budget stretches.", "cast iron casserole dish", [35, 110, 280]),
  cat("bake-roasting-tin", "Kitchen", "Roasting tin", "Deep enough for a chicken.", "roasting tin large", [12, 28, 70]),
  cat("bake-baking-tray", "Kitchen", "Baking trays", "Two, for traybakes and roast veg.", "baking tray set", [10, 24, 55]),
  cat("bake-oven-dish", "Kitchen", "Oven dish", "Lasagne, gratins, oven to table.", "ceramic oven baking dish", [12, 32, 75]),
  cat("bake-cake-tin", "Kitchen", "Cake tin", "Springform is the flexible one.", "springform cake tin", [8, 20, 45]),
  cat("bake-cooling-rack", "Kitchen", "Cooling rack", "Also a trivet in a pinch.", "wire cooling rack", [6, 14, 30]),

  /* ── Kitchen: prep ────────────────────────────────────────── */
  cat("prep-knife-cooks", "Kitchen", "Cook's knife", "The one you will use every day.", "chefs knife 20cm", [12, 45, 150]),
  cat("prep-knife-paring", "Kitchen", "Paring knife", "Small jobs, peeling, trimming.", "paring knife", [6, 18, 55]),
  cat("prep-knife-bread", "Kitchen", "Bread knife", "Serrated, long enough for a sourdough.", "serrated bread knife", [8, 25, 70]),
  cat("prep-knife-storage", "Kitchen", "Knife storage", "Magnetic rack keeps the worktop clear.", "magnetic knife rack wall", [10, 28, 65]),
  cat("prep-knife-sharpener", "Kitchen", "Knife sharpener", "Blunt knives are the dangerous ones.", "knife sharpener", [8, 22, 60]),
  cat("prep-board-wood", "Kitchen", "Wooden chopping board", "For bread, veg and cheese.", "wooden chopping board large", [10, 28, 75]),
  cat("prep-board-plastic", "Kitchen", "Plastic chopping board", "Keep one for raw meat only.", "plastic chopping board set", [6, 16, 38]),
  cat("prep-mixing-bowls", "Kitchen", "Mixing bowls", "Nesting, so they store flat.", "mixing bowl set nesting", [12, 30, 80]),
  cat("prep-scales", "Kitchen", "Kitchen scales", "Digital, with a tare button.", "digital kitchen scales", [10, 25, 60]),
  cat("prep-measuring-jug", "Kitchen", "Measuring jug", "Litre, heatproof.", "measuring jug 1 litre", [4, 12, 28]),
  cat("prep-colander", "Kitchen", "Colander", "Big enough for a full pan of pasta.", "colander large", [5, 15, 38]),
  cat("prep-sieve", "Kitchen", "Sieve", "Fine mesh, for flour and stock.", "fine mesh sieve", [4, 12, 28]),
  cat("prep-grater", "Kitchen", "Grater", "Box grater or microplane.", "box grater", [5, 15, 35]),
  cat("prep-peeler", "Kitchen", "Peeler", "Buy a good one, they are pennies.", "vegetable peeler", [3, 10, 22]),
  cat("prep-utensils", "Kitchen", "Utensil set", "Spoon, slotted spoon, turner, ladle.", "kitchen utensil set", [10, 30, 80]),
  cat("prep-tongs", "Kitchen", "Tongs", "More useful than you would think.", "kitchen tongs", [4, 12, 28]),
  cat("prep-whisk", "Kitchen", "Whisk", "Balloon whisk, stainless.", "balloon whisk", [4, 10, 24]),
  cat("prep-can-opener", "Kitchen", "Tin opener", "The cheap ones fail fast.", "tin opener", [4, 12, 28]),
  cat("prep-corkscrew", "Kitchen", "Corkscrew and bottle opener", "Waiter's friend does both.", "corkscrew bottle opener", [5, 15, 40]),
  cat("prep-pepper-mill", "Kitchen", "Pepper mill", "Pre-ground pepper is a waste.", "pepper mill grinder", [8, 22, 60]),

  /* ── Kitchen: appliances ──────────────────────────────────── */
  cat("app-kettle", "Kitchen", "Kettle", "Rapid boil, and quiet if possible.", "electric kettle 1.7 litre", [20, 60, 180]),
  cat("app-toaster", "Kitchen", "Toaster", "Four slice if there are ever guests.", "toaster 4 slice", [22, 60, 180]),
  cat("app-microwave", "Kitchen", "Microwave", "800W does the job in a flat.", "microwave 800w", [60, 120, 260]),
  cat("app-air-fryer", "Kitchen", "Air fryer", "Dual drawer if you cook for two.", "air fryer dual drawer", [60, 150, 280]),
  cat("app-coffee", "Kitchen", "Coffee maker", "Depends entirely how serious you are.", "filter coffee machine", [25, 90, 400]),
  cat("app-cafetiere", "Kitchen", "Cafetiere", "The no-electricity option.", "cafetiere french press", [10, 25, 60]),
  cat("app-blender", "Kitchen", "Blender", "Soups, smoothies, sauces.", "jug blender", [25, 70, 200]),
  cat("app-hand-mixer", "Kitchen", "Hand mixer", "Cheaper and smaller than a stand mixer.", "electric hand mixer", [15, 40, 90]),

  /* ── Kitchen: storage and worktop ─────────────────────────── */
  cat("store-food-containers", "Kitchen", "Food containers", "Stackable, with lids that stay on.", "food storage container set", [10, 30, 75]),
  cat("store-jars", "Kitchen", "Storage jars", "Pasta, rice, flour, on the counter.", "glass storage jar set", [12, 35, 90]),
  cat("store-bread-bin", "Kitchen", "Bread bin", "Keeps a loaf a day or two longer.", "bread bin", [15, 40, 95]),
  cat("store-utensil-pot", "Kitchen", "Utensil pot", "Next to the hob.", "utensil holder pot", [6, 18, 45]),
  cat("store-spice-rack", "Kitchen", "Spice rack", "Wall or drawer, not a cupboard shelf.", "spice rack", [10, 28, 65]),
  cat("store-wrap-dispenser", "Kitchen", "Foil and clingfilm storage", "Stops the drawer chaos.", "kitchen foil cling film dispenser", [8, 20, 45]),
  cat("store-fruit-bowl", "Kitchen", "Fruit bowl", "Something to fill the middle of the table.", "fruit bowl", [8, 25, 65]),

  /* ── Kitchen: tableware ───────────────────────────────────── */
  cat("table-cutlery", "Kitchen", "Cutlery", "Six settings minimum.", "cutlery set 24 piece", [15, 45, 160]),
  cat("table-dinner-plates", "Kitchen", "Dinner plates", "Six, and pick something replaceable.", "dinner plates set of 6", [15, 40, 110]),
  cat("table-side-plates", "Kitchen", "Side plates", "Breakfast, toast, cake.", "side plates set of 6", [12, 30, 80]),
  cat("table-bowls", "Kitchen", "Bowls", "Pasta and cereal both.", "pasta bowls set of 6", [15, 38, 100]),
  cat("table-mugs", "Kitchen", "Mugs", "More than you think you need.", "mugs set of 6", [12, 30, 75]),
  cat("table-glasses-water", "Kitchen", "Water glasses", "Sturdy, dishwasher proof.", "drinking glasses set of 6", [8, 25, 65]),
  cat("table-glasses-wine", "Kitchen", "Wine glasses", "One shape for everything is fine.", "wine glasses set of 6", [12, 35, 110]),
  cat("table-serving-bowl", "Kitchen", "Serving bowl", "Salad, veg, crisps.", "large serving bowl", [10, 28, 75]),
  cat("table-serving-platter", "Kitchen", "Serving platter", "Roasts and sharing plates.", "serving platter", [12, 30, 80]),
  cat("table-water-jug", "Kitchen", "Water jug", "For the table, with a lid ideally.", "water jug carafe", [8, 25, 65]),
  cat("table-teapot", "Kitchen", "Teapot", "Only if you actually make pots of tea.", "teapot", [12, 30, 75]),
  cat("table-placemats", "Kitchen", "Placemats", "Cork or fabric, six of them.", "placemats set of 6", [10, 28, 65]),
  cat("table-coasters", "Kitchen", "Coasters", "Save the new table.", "coasters set", [6, 18, 45]),

  /* ── Kitchen: washing up ──────────────────────────────────── */
  cat("wash-up-brush", "Kitchen", "Washing up brush", "Replaceable head if you can.", "washing up brush", [3, 10, 25]),
  cat("wash-drying-rack", "Kitchen", "Draining rack", "Sized to the worktop you have.", "dish drainer rack", [12, 35, 90]),
  cat("wash-sink-tidy", "Kitchen", "Sink tidy", "Stops the sponge sitting in water.", "sink tidy caddy", [6, 20, 45]),
  cat("wash-tea-towels", "Kitchen", "Tea towels", "Cotton, and a lot of them.", "tea towels pack", [6, 18, 45]),
  cat("wash-oven-gloves", "Kitchen", "Oven gloves", "Double glove, not the pinch mitts.", "double oven glove", [6, 16, 38]),
  cat("wash-apron", "Kitchen", "Apron", "If you cook properly you will want one.", "kitchen apron", [8, 22, 55]),
  cat("wash-bin-kitchen", "Kitchen", "Kitchen bin", "30 to 50L with a lid.", "kitchen bin with lid 40 litre", [30, 85, 220]),
  cat("wash-bin-recycling", "Kitchen", "Recycling bin", "Somewhere that is not a carrier bag.", "recycling bin kitchen", [20, 55, 130]),
  cat("wash-caddy-food", "Kitchen", "Food waste caddy", "Wandsworth collects it, so you need one.", "food waste caddy kitchen", [8, 20, 45]),

  /* ── Living room: seating and surfaces ────────────────────── */
  cat("liv-coffee-table", "Living room", "Coffee table", "Low, and not too big for the room.", "coffee table", [45, 150, 450]),
  cat("liv-side-table", "Living room", "Side table", "Somewhere to put a drink.", "side table small", [25, 80, 220]),
  cat("liv-tv-unit", "Living room", "TV unit", "Low, with somewhere for the boxes.", "tv stand unit", [50, 160, 450]),
  cat("liv-bookshelf", "Living room", "Bookshelf", "Tall, against a wall.", "bookcase shelving unit", [40, 130, 380]),
  cat("liv-armchair", "Living room", "Armchair", "One good chair beats two bad ones.", "armchair", [90, 300, 900]),
  cat("liv-footstool", "Living room", "Footstool", "Doubles as extra seating.", "footstool ottoman", [30, 90, 250]),
  cat("liv-nest-tables", "Living room", "Nest of tables", "Appear when guests do.", "nest of tables", [40, 110, 300]),
  cat("liv-console", "Living room", "Console table", "Behind the sofa or along a wall.", "console table narrow", [50, 150, 400]),
  cat("liv-magazine-rack", "Living room", "Magazine rack", "Stops the pile on the floor.", "magazine rack", [15, 40, 100]),

  /* ── Living room: soft ────────────────────────────────────── */
  cat("soft-rug-living", "Living room", "Living room rug", "Big enough that the sofa sits on it.", "large living room rug", [45, 180, 600]),
  cat("soft-cushions", "Living room", "Cushions", "Four, in two designs.", "cushion covers set", [15, 45, 130]),
  cat("soft-cushion-pads", "Living room", "Cushion pads", "Feather if you can bear it.", "cushion inner pads", [12, 30, 70]),
  cat("soft-throw", "Living room", "Throw", "Wool, over the arm of the sofa.", "wool throw blanket", [20, 70, 220]),
  cat("soft-curtains-living", "Living room", "Living room curtains", "Measure the drop before you order.", "lined curtains living room", [35, 110, 350]),
  cat("soft-curtain-pole-living", "Living room", "Curtain pole", "Wider than the window by a good bit.", "curtain pole", [15, 45, 120]),
  cat("soft-blind-living", "Living room", "Living room blind", "If curtains are too much.", "roller blind", [15, 45, 130]),

  /* ── Living room: tech ────────────────────────────────────── */
  cat("tech-tv", "Living room", "Television", "50 to 55 inch suits a flat.", "55 inch smart tv 4k", [280, 550, 1300]),
  cat("tech-soundbar", "Living room", "Soundbar", "TV speakers are always disappointing.", "soundbar", [70, 200, 600]),
  cat("tech-speaker", "Living room", "Speaker", "For music rather than television.", "wireless bluetooth speaker", [40, 140, 400]),
  cat("tech-tv-mount", "Living room", "TV wall mount", "Check what the wall is made of first.", "tv wall bracket mount", [15, 40, 100]),
  cat("tech-router-shelf", "Living room", "Router shelf", "Hides the least attractive object you own.", "floating shelf small", [10, 30, 70]),
  cat("tech-cable-tidy", "Living room", "Cable management", "The difference between tidy and not.", "cable management box", [10, 25, 55]),
  cat("tech-extension-lead", "Living room", "Extension leads", "More sockets than you think, surge protected.", "surge protected extension lead", [10, 25, 55]),
  cat("tech-smart-plugs", "Living room", "Smart plugs", "Lamps on a timer, mostly.", "smart plug wifi", [10, 30, 70]),

  /* ── Lighting ─────────────────────────────────────────────── */
  cat("light-floor-lamp", "Living room", "Floor lamp", "Corner light, warmer than the ceiling.", "floor lamp", [30, 90, 280]),
  cat("light-table-lamp-living", "Living room", "Table lamp", "Two, at either end of the room.", "table lamp", [20, 65, 190]),
  cat("light-ceiling-shade-living", "Living room", "Ceiling shade", "The rental fix that changes a room.", "ceiling light shade pendant", [15, 50, 160]),
  cat("light-bulbs-warm", "Practical", "Light bulbs", "Warm white, dimmable, buy a lot.", "led light bulbs warm white pack", [10, 25, 55]),
  cat("light-bedside-lamp", "Bedroom", "Bedside lamps", "A pair, so both sides work.", "bedside table lamp", [18, 55, 150]),
  cat("light-desk-lamp", "Practical", "Desk lamp", "Adjustable arm, for the desk you own.", "adjustable desk lamp", [18, 50, 140]),
  cat("light-hall-shade", "Hall", "Hall ceiling shade", "First thing anyone sees.", "hallway ceiling light shade", [15, 45, 130]),
  cat("light-outdoor-string", "Garden", "Outdoor string lights", "Makes a small garden usable at night.", "outdoor festoon string lights", [20, 55, 140]),

  /* ── Bedroom: the bed ─────────────────────────────────────── */
  cat("bed-duvet", "Bedroom", "Duvet", "10.5 tog does most of the year.", "double duvet 10.5 tog", [20, 60, 200]),
  cat("bed-pillows", "Bedroom", "Pillows", "Four, two firmnesses.", "pillows pack of 4", [15, 45, 140]),
  cat("bed-mattress-protector", "Bedroom", "Mattress protector", "Buy this before the first night.", "mattress protector double", [12, 35, 90]),
  cat("bed-pillow-protectors", "Bedroom", "Pillow protectors", "Doubles the life of a pillow.", "pillow protectors pair", [8, 20, 45]),
  cat("bed-duvet-cover", "Bedroom", "Duvet cover set", "Two sets so one is always clean.", "double duvet cover set", [18, 55, 180]),
  cat("bed-fitted-sheets", "Bedroom", "Fitted sheets", "Two, and deep fitted.", "fitted sheet double", [12, 35, 95]),
  cat("bed-blanket", "Bedroom", "Bed blanket", "For the foot of the bed in winter.", "bed blanket throw", [20, 60, 180]),

  /* ── Bedroom: furniture and storage ───────────────────────── */
  cat("bed-bedside-table", "Bedroom", "Bedside tables", "A pair, with a drawer if possible.", "bedside table", [25, 80, 230]),
  cat("bed-mirror-full", "Bedroom", "Full length mirror", "Leaning, not fixed, in a rental.", "full length mirror", [30, 90, 280]),
  cat("bed-laundry-basket", "Bedroom", "Laundry basket", "Big, lidded, in the bedroom.", "laundry basket lidded", [15, 45, 120]),
  cat("bed-hangers", "Bedroom", "Coat hangers", "Matching wooden ones, forty of them.", "wooden coat hangers pack", [12, 35, 85]),
  cat("bed-underbed-storage", "Bedroom", "Under bed storage", "Where the suitcases and winter coats go.", "under bed storage boxes", [15, 40, 95]),
  cat("bed-drawer-organisers", "Bedroom", "Drawer organisers", "Socks and underwear, mostly.", "drawer organiser set", [10, 28, 65]),
  cat("bed-blackout-blind", "Bedroom", "Blackout blind", "The single best sleep purchase.", "blackout roller blind", [20, 55, 140]),
  cat("bed-curtains", "Bedroom", "Bedroom curtains", "Blackout lined if the blind is not enough.", "blackout curtains bedroom", [30, 90, 260]),
  cat("bed-clothes-rail", "Bedroom", "Clothes rail", "If the wardrobe is not enough.", "clothes rail freestanding", [20, 55, 140]),

  /* ── Second bedroom ───────────────────────────────────────── */
  cat("spare-desk", "Bedrooms", "Desk", "For the second bedroom, working from home.", "home office desk", [50, 150, 400]),
  cat("spare-desk-chair", "Bedrooms", "Desk chair", "Spend here, your back will notice.", "ergonomic office chair", [60, 200, 550]),
  cat("spare-shelving", "Bedrooms", "Shelving", "Books and files off the floor.", "shelving unit", [30, 90, 250]),
  cat("spare-guest-bedding", "Bedrooms", "Spare bedding", "One full set, boxed away.", "single duvet cover set", [15, 45, 120]),
  cat("spare-airbed", "Bedrooms", "Air bed", "For the friends who stay over.", "inflatable air bed double", [25, 70, 180]),

  /* ── Bathroom ─────────────────────────────────────────────── */
  cat("bath-towels-bath", "Bathroom", "Bath towels", "Four, in one colour.", "bath towels set", [18, 55, 160]),
  cat("bath-towels-hand", "Bathroom", "Hand towels", "Four, matching the bath towels.", "hand towels set", [10, 30, 80]),
  cat("bath-bath-mat", "Bathroom", "Bath mat", "Non slip backing matters.", "bath mat non slip", [10, 30, 75]),
  cat("bath-shower-curtain", "Bathroom", "Shower curtain", "Skip if there is a screen.", "shower curtain", [8, 25, 60]),
  cat("bath-shower-rail", "Bathroom", "Shower curtain rail", "Tension rail if you cannot drill.", "shower curtain rail", [12, 35, 85]),
  cat("bath-bin", "Bathroom", "Bathroom bin", "Small, with a lid.", "small bathroom bin with lid", [10, 28, 70]),
  cat("bath-toilet-brush", "Bathroom", "Toilet brush", "Enclosed holder, please.", "toilet brush holder", [8, 22, 55]),
  cat("bath-storage-unit", "Bathroom", "Bathroom storage", "Freestanding, over or beside the loo.", "bathroom storage unit freestanding", [25, 70, 190]),
  cat("bath-mirror-cabinet", "Bathroom", "Bathroom mirror", "With a shelf or a cabinet behind.", "bathroom mirror", [20, 60, 180]),
  cat("bath-soap-dispenser", "Bathroom", "Soap dispenser", "Refillable, not a plastic bottle.", "soap dispenser bathroom", [6, 18, 45]),
  cat("bath-toothbrush-holder", "Bathroom", "Toothbrush holder", "Small thing, seen every day.", "toothbrush holder", [5, 15, 38]),
  cat("bath-laundry-hamper", "Bathroom", "Bathroom laundry basket", "If the bedroom one is not enough.", "laundry hamper bathroom", [15, 40, 100]),
  cat("bath-scales", "Bathroom", "Bathroom scales", "Digital, flat surface only.", "digital bathroom scales", [12, 32, 80]),
  cat("bath-shower-caddy", "Bathroom", "Shower caddy", "Hanging or corner.", "shower caddy", [10, 28, 65]),
  cat("bath-towel-rail", "Bathroom", "Towel rail", "Freestanding avoids drilling tiles.", "freestanding towel rail", [18, 50, 130]),

  /* ── Hall ─────────────────────────────────────────────────── */
  cat("hall-doormat", "Hall", "Doormat", "Coir, and bigger than feels necessary.", "doormat coir", [10, 28, 65]),
  cat("hall-shoe-storage", "Hall", "Shoe storage", "Narrow, or the hall disappears.", "narrow shoe storage cabinet", [30, 85, 220]),
  cat("hall-coat-hooks", "Hall", "Coat hooks", "Wall mounted, five or six.", "coat hooks wall mounted rack", [10, 30, 80]),
  cat("hall-coat-stand", "Hall", "Coat stand", "If the wall is not an option.", "coat stand freestanding", [25, 65, 170]),
  cat("hall-console", "Hall", "Hall table", "Keys, post, the drop zone.", "hallway console table narrow", [35, 100, 280]),
  cat("hall-mirror", "Hall", "Hall mirror", "Makes a narrow hall wider.", "hallway wall mirror", [20, 65, 190]),
  cat("hall-key-hooks", "Hall", "Key hooks", "So you stop losing them.", "key holder wall", [6, 18, 45]),
  cat("hall-umbrella-stand", "Hall", "Umbrella stand", "London, after all.", "umbrella stand", [15, 40, 100]),
  cat("hall-runner", "Hall", "Hall runner", "Long and narrow, protects the floor.", "hallway runner rug", [25, 70, 200]),

  /* ── Utility and laundry ──────────────────────────────────── */
  cat("util-airer", "Utility", "Clothes airer", "Three tier, folds flat.", "3 tier clothes airer", [15, 40, 95]),
  cat("util-iron", "Utility", "Iron", "Steam, with a decent soleplate.", "steam iron", [18, 50, 140]),
  cat("util-ironing-board", "Utility", "Ironing board", "Full size if there is room.", "ironing board", [20, 50, 120]),
  cat("util-washing-basket", "Utility", "Washing basket", "For carrying, not storing.", "washing basket", [8, 22, 55]),
  cat("util-pegs", "Utility", "Clothes pegs", "Wooden or steel, not the brittle plastic.", "clothes pegs pack", [4, 12, 28]),
  cat("util-dehumidifier", "Utility", "Dehumidifier", "Ground floor flat, worth considering.", "dehumidifier", [50, 150, 350]),
  cat("util-drying-rack-radiator", "Utility", "Radiator airer", "For the small loads.", "radiator airer", [8, 20, 45]),

  /* ── Cleaning ─────────────────────────────────────────────── */
  cat("clean-vacuum", "Utility", "Vacuum cleaner", "Cordless is worth the money in a flat.", "cordless vacuum cleaner", [70, 220, 550]),
  cat("clean-mop", "Utility", "Mop and bucket", "Spin mop, hard floors.", "spin mop and bucket", [15, 40, 90]),
  cat("clean-broom", "Utility", "Broom", "Soft bristle, indoor.", "indoor broom", [8, 20, 45]),
  cat("clean-dustpan", "Utility", "Dustpan and brush", "Long handled saves your back.", "dustpan and brush set", [6, 18, 42]),
  cat("clean-caddy", "Utility", "Cleaning caddy", "Carry it room to room.", "cleaning caddy caddy organiser", [8, 20, 45]),
  cat("clean-cloths", "Utility", "Cleaning cloths", "Microfibre, a big pack.", "microfibre cleaning cloths pack", [6, 16, 38]),
  cat("clean-window-squeegee", "Utility", "Window squeegee", "Ground floor windows get dirty fast.", "window cleaning squeegee", [6, 18, 42]),
  cat("clean-rubber-gloves", "Utility", "Rubber gloves", "Two pairs.", "rubber cleaning gloves", [4, 10, 24]),

  /* ── Storage ──────────────────────────────────────────────── */
  cat("store-boxes-fabric", "Practical", "Storage boxes", "Fabric, for shelves and wardrobes.", "fabric storage boxes set", [12, 35, 85]),
  cat("store-boxes-plastic", "Practical", "Plastic storage boxes", "Lidded, for the loft or under the bed.", "plastic storage boxes with lids", [15, 40, 90]),
  cat("store-baskets", "Practical", "Storage baskets", "Seagrass or rattan, for the living room.", "seagrass storage basket", [15, 45, 110]),
  cat("store-shoe-rack", "Practical", "Shoe rack", "For the wardrobe rather than the hall.", "shoe rack", [12, 35, 85]),
  cat("store-vacuum-bags", "Practical", "Vacuum storage bags", "Winter duvets and coats.", "vacuum storage bags", [10, 25, 55]),
  cat("store-hooks-adhesive", "Practical", "Adhesive hooks", "Rental friendly, no drilling.", "adhesive wall hooks", [6, 15, 35]),

  /* ── Tools and DIY ────────────────────────────────────────── */
  cat("tool-drill", "Tools", "Cordless drill", "For shelves, blinds and flat pack.", "cordless drill driver", [35, 100, 260]),
  cat("tool-screwdrivers", "Tools", "Screwdriver set", "Precision bits included.", "screwdriver set", [10, 30, 75]),
  cat("tool-hammer", "Tools", "Hammer", "Claw hammer, ordinary weight.", "claw hammer", [8, 20, 45]),
  cat("tool-spirit-level", "Tools", "Spirit level", "Shelves and pictures.", "spirit level", [8, 22, 55]),
  cat("tool-tape-measure", "Tools", "Tape measure", "Five metre, locking.", "tape measure 5m", [5, 14, 32]),
  cat("tool-stud-finder", "Tools", "Stud and pipe detector", "Before you drill into anything.", "stud detector pipe finder", [15, 40, 90]),
  cat("tool-allen-keys", "Tools", "Allen keys", "For everything flat pack.", "allen key set hex", [6, 16, 38]),
  cat("tool-pliers", "Tools", "Pliers", "Combination and long nose.", "pliers set", [10, 25, 60]),
  cat("tool-toolbox", "Tools", "Toolbox", "Somewhere it all lives.", "toolbox", [15, 40, 100]),
  cat("tool-stepladder", "Tools", "Step ladder", "Three step, for bulbs and curtains.", "step ladder 3 step", [25, 60, 140]),
  cat("tool-fixings", "Tools", "Wall fixings", "Rawlplugs, screws, picture hooks.", "wall plugs and screws set", [8, 20, 45]),
  cat("tool-torch", "Tools", "Torch", "For the fuse box and the cupboard.", "led torch rechargeable", [10, 28, 70]),

  /* ── Safety ───────────────────────────────────────────────── */
  cat("safe-smoke-alarm", "Practical", "Smoke alarm", "One per floor, minimum.", "smoke alarm", [10, 28, 65]),
  cat("safe-co-alarm", "Practical", "Carbon monoxide alarm", "If there is gas, this is not optional.", "carbon monoxide alarm", [15, 32, 70]),
  cat("safe-fire-blanket", "Practical", "Fire blanket", "Kitchen wall, near the door.", "fire blanket kitchen", [8, 20, 45]),
  cat("safe-fire-extinguisher", "Practical", "Fire extinguisher", "Small, dry powder.", "fire extinguisher home", [15, 35, 80]),
  cat("safe-first-aid", "Practical", "First aid kit", "Boxed, in a known place.", "first aid kit home", [10, 28, 65]),
  cat("safe-torch-emergency", "Practical", "Emergency light", "For when the power goes.", "emergency light power cut", [10, 25, 55]),

  /* ── Decor ────────────────────────────────────────────────── */
  cat("dec-art-large", "Living room", "Large artwork", "One big piece beats five small ones.", "large framed wall art", [30, 120, 400]),
  cat("dec-art-prints", "Living room", "Prints", "A set, for a gallery wall.", "art prints set framed", [20, 60, 180]),
  cat("dec-frames", "Practical", "Picture frames", "For the photographs you never print.", "picture frames set", [12, 35, 85]),
  cat("dec-mirror-decorative", "Living room", "Decorative mirror", "Bounces light around a dark room.", "round wall mirror decorative", [25, 80, 240]),
  cat("dec-plants-large", "Living room", "Large houseplant", "One statement plant per room.", "large indoor plant", [20, 60, 160]),
  cat("dec-plants-small", "Living room", "Small houseplants", "Three, for shelves and sills.", "small indoor plants set", [12, 32, 75]),
  cat("dec-plant-pots", "Living room", "Plant pots", "Match them, it looks deliberate.", "indoor plant pots set", [12, 35, 90]),
  cat("dec-candles", "Living room", "Candles", "Scented, for the evening.", "scented candle", [8, 25, 70]),
  cat("dec-vase", "Living room", "Vase", "For actual flowers, occasionally.", "vase", [10, 30, 85]),
  cat("dec-clock", "Living room", "Wall clock", "Silent movement, or you will regret it.", "wall clock silent", [12, 35, 90]),
  cat("dec-books-shelf", "Living room", "Bookends", "Once there are books.", "bookends pair", [10, 25, 60]),
  cat("dec-tray", "Living room", "Serving tray", "Coffee table, or breakfast in bed.", "serving tray", [10, 30, 75]),

  /* ── Garden and outdoor ───────────────────────────────────── */
  cat("gard-table-chairs", "Garden", "Garden table and chairs", "Two seats is enough for a small garden.", "garden bistro table and chairs", [60, 180, 500]),
  cat("gard-lounger", "Garden", "Sun lounger", "Ground floor flat with a garden, use it.", "sun lounger garden", [35, 100, 280]),
  cat("gard-parasol", "Garden", "Parasol", "Or the garden is unusable in July.", "garden parasol", [25, 70, 200]),
  cat("gard-bbq", "Garden", "Barbecue", "Charcoal or gas, decide now.", "charcoal barbecue", [30, 120, 400]),
  cat("gard-firepit", "Garden", "Fire pit", "Extends the evening into September.", "garden fire pit", [30, 90, 250]),
  cat("gard-watering-can", "Garden", "Watering can", "Metal outlasts plastic by decades.", "watering can", [8, 25, 60]),
  cat("gard-hose", "Garden", "Hose", "With a reel, or it becomes a knot.", "garden hose reel", [20, 55, 140]),
  cat("gard-tools", "Garden", "Garden hand tools", "Trowel, fork, secateurs.", "garden hand tool set", [12, 35, 85]),
  cat("gard-secateurs", "Garden", "Secateurs", "Bypass, not anvil.", "bypass secateurs", [10, 28, 70]),
  cat("gard-gloves", "Garden", "Garden gloves", "Two pairs, one heavy duty.", "gardening gloves", [6, 16, 38]),
  cat("gard-pots-outdoor", "Garden", "Outdoor planters", "Frost proof, or they crack.", "outdoor planters large", [20, 60, 170]),
  cat("gard-compost-bin", "Garden", "Compost bin", "Small garden, small bin.", "compost bin garden", [20, 50, 120]),
  cat("gard-storage-box", "Garden", "Garden storage box", "Cushions, tools, the hose.", "garden storage box waterproof", [40, 110, 300]),
  cat("gard-broom-outdoor", "Garden", "Outdoor broom", "Stiff bristle, for the patio.", "outdoor yard broom", [8, 20, 45]),
  cat("gard-bird-feeder", "Garden", "Bird feeder", "Cheap pleasure, immediate payoff.", "bird feeder garden", [8, 22, 55]),
  cat("gard-doormat-outdoor", "Garden", "Outdoor mat", "Back door, before the mud.", "outdoor door mat", [10, 25, 60]),
];

export default CATEGORIES;
