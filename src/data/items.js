/* ────────────────────────────────────────────────────────────
   The shopping list.

   Extracted from the original component so that both the app and
   scripts/fetch-products.mjs can import the same source of truth.
   Plain JS with no JSX or React import, so Node can load it directly.

   `price` is Andy's own estimate. The scraper resolves the real
   current price separately into src/data/products.json — it never
   edits this file.
   ──────────────────────────────────────────────────────────── */

export const IKEA = "IKEA";
export const JL = "John Lewis";

const it = (id, room, name, note, opts) => ({
  id,
  room,
  name,
  note,
  options: opts.map(([tier, retailer, title, desc, price]) => ({ tier, retailer, title, desc, price })),
});

export const ITEMS = [
  it("bin", "Kitchen", "Kitchen and recycling bins", "30 to 50L, plus somewhere for recycling that is not a carrier bag.", [
    ["Thrifty", IKEA, "KNODD bin with lid 40L", "Steel, no pedal", 45],
    ["Sensible", JL, "ANYDAY sensor bin 45L", "Hands free, quiet close", 80],
    ["Splurge", JL, "Brabantia Touch Bin 40L", "10 year guarantee", 200],
  ]),
  it("cutlery", "Kitchen", "Cutlery", "Not in your basket yet. Six settings to match the GLADELIG plates.", [
    ["Thrifty", IKEA, "MOPSIG cutlery set 20 piece", "Brushed stainless", 15],
    ["Sensible", JL, "John Lewis ANYDAY cutlery set 16 piece", "Mirror polished", 25],
    ["Splurge", JL, "Robert Welch Radford cutlery 24 piece", "Heavy in the hand, lasts decades", 145],
  ]),
  it("boards", "Kitchen", "Chopping boards", "Two minimum, one kept for raw meat.", [
    ["Thrifty", IKEA, "APTITLIG chopping board bamboo", "Light, needs oiling", 14],
    ["Sensible", JL, "John Lewis ANYDAY beech chopping board", "Chunkier, hand wash only", 20],
    ["Splurge", JL, "Joseph Joseph Index chopping board set", "Colour coded, no cross contamination", 40],
  ]),
  it("knives", "Kitchen", "Knives", "A cook's knife, a paring knife and a bread knife covers 95 percent.", [
    ["Thrifty", IKEA, "VÖRDA knife set 3 piece", "Does the job", 22],
    ["Sensible", JL, "John Lewis ANYDAY knife block 5 piece", "Includes a sharpener", 45],
    ["Splurge", JL, "Robert Welch Signature knife block", "The last set you buy", 180],
  ]),
  it("knifestore", "Kitchen", "Knife storage", "Magnetic rack keeps the worktop clear.", [
    ["Thrifty", IKEA, "KUNGSFORS magnetic knife rack", "Stainless, wall fixed", 14],
    ["Sensible", JL, "John Lewis walnut magnetic knife rack", "Warmer than steel", 30],
    ["Splurge", JL, "Joseph Joseph DrawerStore knife organiser", "Hides them in a drawer instead", 30],
  ]),
  it("pans", "Kitchen", "Pots and pans", "Two saucepans, a frying pan and a stockpot.", [
    ["Thrifty", IKEA, "ANNONS cookware set 3 piece", "Fine to start", 30],
    ["Sensible", JL, "John Lewis ANYDAY stainless steel pan set 5 piece", "Induction ready, oven safe", 90],
    ["Splurge", JL, "Le Creuset 3 ply stainless pan set", "Proper heat control", 220],
  ]),
  it("bakeware", "Kitchen", "Oven trays and dishes", "Roasting tin, baking sheet, lasagne dish.", [
    ["Thrifty", IKEA, "KONCIS roasting tin", "Stainless", 20],
    ["Sensible", JL, "John Lewis ANYDAY bakeware set", "Non stick, dishwasher safe", 30],
    ["Splurge", JL, "Le Creuset stoneware rectangular dish", "Goes oven to table", 65],
  ]),
  it("prep", "Kitchen", "Prep kit and scales", "Colander, mixing bowls, measuring jug, kitchen scales.", [
    ["Thrifty", IKEA, "IDEALISK colander", "Stackable, basic", 28],
    ["Sensible", JL, "John Lewis ANYDAY mixing bowl set", "Nesting bowls", 48],
    ["Splurge", JL, "Mason Cash mixing bowl set", "Heirloom ceramic", 80],
  ]),
  it("utensils", "Kitchen", "Utensils and gadgets", "Spatula, ladle, tongs, peeler, tin opener, grater, scissors.", [
    ["Thrifty", IKEA, "DIREKT kitchen utensil set", "Cheap and replaceable", 18],
    ["Sensible", JL, "John Lewis ANYDAY kitchen utensil set", "Sensible middle", 38],
    ["Splurge", JL, "OXO Good Grips kitchen utensil set", "Genuinely nicer to use", 70],
  ]),
  it("kettle", "Kitchen", "Kettle", "IKEA does not sell these in the UK.", [
    ["Thrifty", JL, "Russell Hobbs Inspire kettle", "Rapid boil", 30],
    ["Sensible", JL, "John Lewis ANYDAY kettle 1.7L", "Quiet, limescale filter", 40],
    ["Splurge", JL, "Smeg 50s Retro kettle KLF03", "Bought for the worktop, not the water", 150],
  ]),
  it("toaster", "Kitchen", "Toaster", "Match it to the kettle or deliberately do not.", [
    ["Thrifty", JL, "Russell Hobbs Inspire 2 slice toaster", "Wide slots", 30],
    ["Sensible", JL, "John Lewis ANYDAY 2 slice toaster", "Defrost and reheat", 38],
    ["Splurge", JL, "Smeg 50s Retro 2 slice toaster TSF01", "Pairs with the kettle", 150],
  ]),
  it("cooker", "Kitchen", "Microwave or air fryer", "Worktop space is finite, so pick one to start.", [
    ["Thrifty", JL, "Russell Hobbs solo microwave 20L", "Reheating and nothing else", 75],
    ["Sensible", JL, "Ninja Foodi Dual Zone air fryer AF300", "You will use it four nights a week", 160],
    ["Splurge", JL, "Ninja Double Stack air fryer oven", "Replaces both", 280],
  ]),
  it("jars", "Kitchen", "Dry goods jars", "Cereal, flour, sugar, pasta.", [
    ["Thrifty", IKEA, "KORKEN jar with lid clear glass", "Clear, cheap, heavy", 16],
    ["Sensible", IKEA, "IKEA 365+ dry food jar with lid", "Airtight seal", 26],
    ["Splurge", JL, "OXO Good Grips POP container set", "One handed lids, properly airtight", 60],
  ]),
  it("tubs", "Kitchen", "Food storage tubs", "For batch cooking and leftovers.", [
    ["Thrifty", IKEA, "PRUTA food container 17 piece", "Plastic, stains", 8],
    ["Sensible", IKEA, "IKEA 365+ food container glass", "Oven and freezer safe", 32],
    ["Splurge", JL, "Joseph Joseph Nest Lock storage set", "Nests flat, lids clip on", 45],
  ]),
  it("drainer", "Kitchen", "Dish drainer", "Even with a dishwasher you need one.", [
    ["Thrifty", IKEA, "IKEA dish drainer stainless steel", "Simple", 12],
    ["Sensible", JL, "John Lewis ANYDAY dish drainer", "Drains into the sink", 22],
    ["Splurge", JL, "Joseph Joseph Y rack dish drainer", "Tilts and empties itself", 45],
  ]),
  it("washingup", "Kitchen", "Washing up kit", "Brush, sponges, soap dispenser, cloths, rubber gloves.", [
    ["Thrifty", IKEA, "TÅRTSPADE washing up brush", "Replace often", 12],
    ["Sensible", JL, "John Lewis ANYDAY sink tidy set", "Matching, sits by the tap", 28],
    ["Splurge", JL, "Joseph Joseph CleanTech sink caddy", "Keeps the sink edge clear", 45],
  ]),
  it("linens", "Kitchen", "Tea towels and oven gloves", "Buy more tea towels than feels sensible.", [
    ["Thrifty", IKEA, "ELLY tea towel", "Cotton, fine", 12],
    ["Sensible", JL, "John Lewis ANYDAY tea towels and oven glove", "Thicker weave", 22],
    ["Splurge", JL, "John Lewis linen tea towel set", "Looks good hanging up", 45],
  ]),
  it("spice", "Kitchen", "Spice rack", "Wall mounted, so measure before you buy.", [
    ["Thrifty", IKEA, "BEKVÄM spice rack", "Solid wood, paint or stain it", 14],
    ["Sensible", IKEA, "KUNGSFORS rail with containers", "Frees the whole worktop", 32],
    ["Splurge", JL, "John Lewis wall mounted spice rack", "Warmer against olive walls", 45],
  ]),
  it("mats", "Kitchen", "Coasters and placemats", "Six of each to match the plates.", [
    ["Thrifty", IKEA, "AVSKILD place mat", "Wipe clean", 12],
    ["Sensible", JL, "John Lewis ANYDAY faux leather placemats", "Reversible, ages well", 28],
    ["Splurge", JL, "John Lewis Croft Collection slate coasters", "Heavier, quieter on the table", 48],
  ]),
  it("serving", "Kitchen", "Serving dishes and a water jug", "The gap between plates and actually feeding nine people.", [
    ["Thrifty", IKEA, "IKEA 365+ serving bowl", "Plain white, goes with anything", 20],
    ["Sensible", JL, "John Lewis ANYDAY serving platter set", "Two sizes plus platter", 45],
    ["Splurge", JL, "John Lewis stoneware serving bowl and carafe", "Matches the GLADELIG glaze", 90],
  ]),
  it("consumables", "Kitchen", "First shop consumables", "Foil, cling film, bin bags, kitchen roll, dishwasher tabs.", [
    ["Thrifty", IKEA, "ISTAD resealable bag", "Gets you to week two", 25],
    ["Sensible", JL, "John Lewis kitchen foil and cling film", "Everything at once", 45],
    ["Splurge", JL, "Joseph Joseph wrap store kitchen organiser", "Ends the drawer chaos", 80],
  ]),

  it("bathbin", "Bathroom", "Bathroom bin", "Small, with a lid.", [
    ["Thrifty", IKEA, "TOFTAN waste bin 5L", "Plastic", 8],
    ["Sensible", JL, "John Lewis ANYDAY pedal bin 5L", "Soft close", 25],
    ["Splurge", JL, "Brabantia NewIcon pedal bin 5L", "Matches the kitchen bin", 45],
  ]),
  it("brush", "Bathroom", "Toilet brush", "One per bathroom.", [
    ["Thrifty", IKEA, "BOLMEN toilet brush and holder", "Costs less than a coffee", 3],
    ["Sensible", JL, "John Lewis ANYDAY toilet brush and holder", "Ceramic base", 18],
    ["Splurge", JL, "Joseph Joseph Flex Steel toilet brush", "Drains dry, no puddle", 30],
  ]),
  it("towels", "Bathroom", "Towels", "Two bath and two hand each, plus a guest set.", [
    ["Thrifty", IKEA, "VÅGSJÖN bath towel", "Thin but fine", 26],
    ["Sensible", JL, "John Lewis ANYDAY Egyptian cotton towel", "Good weight, holds colour", 55],
    ["Splurge", JL, "John Lewis Ultimate Egyptian cotton towel", "Hotel thickness", 120],
  ]),
  it("bathmat", "Bathroom", "Bath mat", "Quick drying matters in a ground floor flat.", [
    ["Thrifty", IKEA, "TOFTBO bath mat memory foam", "Dries fast", 12],
    ["Sensible", JL, "John Lewis ANYDAY cotton bath mat", "Machine washable", 22],
    ["Splurge", JL, "John Lewis Egyptian cotton bath mat", "Matches the towels", 38],
  ]),
  it("shower", "Bathroom", "Shower curtain and rail", "Skip if there is already a screen.", [
    ["Thrifty", IKEA, "BJÄRSEN shower curtain", "Mould resistant", 22],
    ["Sensible", JL, "John Lewis ANYDAY shower curtain and rail", "Weighted hem", 45],
    ["Splurge", JL, "John Lewis linen look shower curtain", "Softer than plastic", 90],
  ]),
  it("bathstore", "Bathroom", "Bathroom storage", "Somewhere for spares that is not the floor.", [
    ["Thrifty", IKEA, "RÅGRUND corner wall shelf bamboo", "Fits over the loo", 30],
    ["Sensible", IKEA, "RÅSKOG trolley", "Rolls out, holds everything", 45],
    ["Splurge", JL, "John Lewis freestanding bathroom shelf unit", "Looks intentional", 95],
  ]),
  it("cabinet", "Bathroom", "Mirrored cabinet", "Mirror and storage in one, so the shelf stays clear.", [
    ["Thrifty", IKEA, "LILLÅNGEN mirror cabinet", "Basic, effective", 55],
    ["Sensible", IKEA, "ENHET mirror cabinet with doors", "Shaver socket options", 130],
    ["Splurge", JL, "John Lewis illuminated demister bathroom cabinet", "No wiping it after a shower", 300],
  ]),
  it("bathbits", "Bathroom", "Soap, toothbrush and roll holders", "The last five percent that makes it feel finished.", [
    ["Thrifty", IKEA, "TACKAN soap dispenser", "Plastic, replaceable", 10],
    ["Sensible", JL, "John Lewis ANYDAY ceramic bathroom accessories set", "Weighted, does not slide", 32],
    ["Splurge", JL, "John Lewis Croft Collection stoneware bathroom set", "Warm glaze, matches GLADELIG", 58],
  ]),

  it("bedside", "Bedrooms", "Bedside tables, x2", "One per bed, drawer preferred.", [
    ["Thrifty", IKEA, "KULLEN chest of 2 drawers", "Basic but functional", 70],
    ["Sensible", IKEA, "MALM bedside table", "Cleaner lines, soft close", 120],
    ["Splurge", JL, "John Lewis ANYDAY bedside chest oak", "Solid wood, real drawers", 240],
  ]),
  it("bedlamps", "Bedrooms", "Bedside lamps, x2", "Warm bulbs, 2700K.", [
    ["Thrifty", IKEA, "RANARP table lamp", "Metal, directional", 55],
    ["Sensible", JL, "John Lewis ANYDAY ceramic table lamp", "Fabric shade, softer light", 95],
    ["Splurge", JL, "Anglepoise Type 75 Mini desk lamp", "Reads properly, looks the part", 300],
  ]),
  it("duvets", "Bedrooms", "Duvets, x2", "10.5 tog is the year round answer.", [
    ["Thrifty", IKEA, "SMÅSPORRE duvet 10.5 tog", "Washable", 60],
    ["Sensible", JL, "John Lewis ANYDAY microfibre duvet 10.5 tog", "Anti allergy", 90],
    ["Splurge", JL, "John Lewis Hungarian goose down duvet", "Light and very warm", 320],
  ]),
  it("pillows", "Bedrooms", "Pillows, x4", "Two per bed, plus spares.", [
    ["Thrifty", IKEA, "SKOGSLÖK pillow", "Replace yearly", 40],
    ["Sensible", JL, "John Lewis ANYDAY microfibre pillow", "Medium support", 65],
    ["Splurge", JL, "John Lewis Specialist Synthetic pillow", "Firmness matched to sleep style", 130],
  ]),
  it("protectors", "Bedrooms", "Mattress protectors, x2", "Buy these before the first night, not after.", [
    ["Thrifty", IKEA, "ROSENVIAL mattress protector", "Basic cover", 30],
    ["Sensible", JL, "John Lewis ANYDAY mattress protector", "Deep fitted skirt", 48],
    ["Splurge", JL, "John Lewis Soft Touch waterproof mattress protector", "Silent, no crinkle", 95],
  ]),
  it("bedding", "Bedrooms", "Bedding sets", "Two sets per bed so one is always in the wash.", [
    ["Thrifty", IKEA, "ÄNGSLILJA duvet cover and pillowcase", "Cotton, softens with washing", 110],
    ["Sensible", JL, "John Lewis ANYDAY cotton duvet cover set", "200 thread count", 190],
    ["Splurge", JL, "John Lewis washed linen duvet cover", "Suits the warm minimal look", 420],
  ]),
  it("hangers", "Bedrooms", "Coat hangers", "You need roughly double what you think.", [
    ["Thrifty", IKEA, "BUMERANG hanger", "Sturdy", 22],
    ["Sensible", JL, "John Lewis ANYDAY wooden hangers", "Trouser bar", 38],
    ["Splurge", JL, "John Lewis velvet slimline hangers", "Fits a third more on the rail", 60],
  ]),
  it("mirror", "Bedrooms", "Full length mirror", "Lean it, do not hang it, until the walls are sorted.", [
    ["Thrifty", IKEA, "LINDBYN mirror", "Simple frame", 65],
    ["Sensible", JL, "John Lewis ANYDAY full length mirror", "Deeper frame", 120],
    ["Splurge", JL, "John Lewis arched full length mirror", "Bounces light from the bay", 260],
  ]),
  it("laundry", "Bedrooms", "Laundry baskets, x2", "Two, so darks and lights sort themselves.", [
    ["Thrifty", IKEA, "JÄLL laundry bag with stand", "Fabric, folds flat", 22],
    ["Sensible", JL, "John Lewis ANYDAY seagrass laundry basket", "Looks better on show", 55],
    ["Splurge", JL, "Brabantia laundry bin 55L", "Lasts, has a liner", 90],
  ]),
  it("underbed", "Bedrooms", "Under bed storage", "The only free storage in a flat.", [
    ["Thrifty", IKEA, "SKUBB storage case", "Fabric, zipped", 25],
    ["Sensible", IKEA, "VARDÖ bed storage box", "Wheels, lids", 55],
    ["Splurge", JL, "John Lewis vacuum storage bags", "Halves the volume of bedding", 90],
  ]),

  it("floorlamp", "Living room", "Floor lamp", "Corner light beats a ceiling light every time.", [
    ["Thrifty", IKEA, "HEKTAR floor lamp", "Big shade, warm pool of light", 65],
    ["Sensible", JL, "John Lewis ANYDAY tripod floor lamp", "Reaches over the sofa", 130],
    ["Splurge", JL, "John Lewis arc floor lamp", "The one thing people notice", 320],
  ]),
  it("coffeetable", "Living room", "Coffee table", "Leave 40cm between it and the VIMLE.", [
    ["Thrifty", IKEA, "LACK coffee table", "Cheap, light, temporary", 45],
    ["Sensible", IKEA, "LISTERBY coffee table oak veneer", "Warm wood, storage shelf", 180],
    ["Splurge", JL, "John Lewis Calia coffee table oak", "Survives the next three flats", 350],
  ]),
  it("sidetable", "Living room", "Side table", "For the end of the corner sofa.", [
    ["Thrifty", IKEA, "GLADOM tray table", "Lift off tray top", 25],
    ["Sensible", IKEA, "LISTERBY side table oak veneer", "Matches the coffee table", 90],
    ["Splurge", JL, "John Lewis marble side table", "Weighty, feels expensive", 160],
  ]),
  it("soft", "Living room", "Cushions and throw", "Where the deep olive goes if the sofa is neutral.", [
    ["Thrifty", IKEA, "GURLI cushion cover", "Swap covers seasonally", 65],
    ["Sensible", JL, "John Lewis ANYDAY cushion and throw", "Better fabric weight", 130],
    ["Splurge", JL, "John Lewis Croft Collection wool throw", "Worth it on a light sofa", 260],
  ]),
  it("tv", "Living room", "TV", "Your BESTÅ bench takes up to roughly 55 inches comfortably.", [
    ["Thrifty", JL, "Hisense 50 inch 4K smart TV", "Good enough, 5 year guarantee", 350],
    ["Sensible", JL, "Samsung 55 inch QLED smart TV", "Bright, handles the south facing bay", 700],
    ["Splurge", JL, "LG OLED evo 55 inch smart TV", "Black levels you notice", 1400],
  ]),
  it("cables", "Living room", "Cables and aerial kit", "The thing that ruins moving in day.", [
    ["Thrifty", JL, "John Lewis HDMI cable", "Bare minimum", 15],
    ["Sensible", JL, "John Lewis surge protected extension lead", "Hides the mess behind BESTÅ", 38],
    ["Splurge", JL, "John Lewis TV wall bracket", "Only if you skip the bench", 90],
  ]),
  it("bookshelf", "Living room", "Shelving", "The short wall can take a full height unit.", [
    ["Thrifty", IKEA, "BILLY bookcase", "The default for a reason", 70],
    ["Sensible", IKEA, "BILLY OXBERG bookcase with doors", "Half open, half hidden", 160],
    ["Splurge", JL, "ercol for John Lewis Shalstone shelving unit oak", "Furniture rather than storage", 400],
  ]),
  it("plants", "Living room", "Plants and pots", "A south facing bay is a very good plant spot.", [
    ["Thrifty", IKEA, "FEJKA artificial potted plant", "Start with the hard to kill ones", 45],
    ["Sensible", IKEA, "MONSTERA potted plant with pot", "Fills the bay corner", 110],
    ["Splurge", JL, "John Lewis large faux olive tree", "Instant maturity in the room", 250],
  ]),
  it("art", "Living room", "Art, frames and candles", "The last layer. Do it after everything else lands.", [
    ["Thrifty", IKEA, "RIBBA frame", "Print your own photos", 60],
    ["Sensible", JL, "John Lewis framed print", "Ready to hang", 150],
    ["Splurge", JL, "John Lewis large framed wall art", "One large piece beats five small", 400],
  ]),

  it("doormat", "Hall", "Doormat", "Ground floor flat, so buy the heavy one.", [
    ["Thrifty", IKEA, "TRAMPA door mat", "Cheap, works", 12],
    ["Sensible", JL, "John Lewis ANYDAY coir doormat", "Thicker pile", 25],
    ["Splurge", JL, "John Lewis heavy duty doormat", "Lasts a British winter", 45],
  ]),
  it("shoes", "Hall", "Shoe storage", "Measure the hall width before ordering.", [
    ["Thrifty", IKEA, "GREJIG shoe rack", "Open rack", 20],
    ["Sensible", IKEA, "STÄLL shoe cabinet", "Slim, hides everything", 95],
    ["Splurge", JL, "John Lewis shoe storage bench", "Somewhere to sit and lace up", 180],
  ]),
  it("hooks", "Hall", "Coat and key hooks", "Fixings matter more than the hook.", [
    ["Thrifty", IKEA, "TJUSIG hook rack", "Screw straight in", 15],
    ["Sensible", IKEA, "PINNIG bench with coat rack", "Bench, hooks and shelf in one", 75],
    ["Splurge", JL, "John Lewis coat rack with shelf", "Solid wood, brass hooks", 120],
  ]),

  it("vacuum", "Utility", "Vacuum", "Cordless if you will actually use it, corded if you want suction.", [
    ["Thrifty", JL, "Shark corded upright vacuum", "Strong suction, annoying cable", 95],
    ["Sensible", JL, "Shark cordless stick vacuum", "Good middle ground", 250],
    ["Splurge", JL, "Dyson V15 Detect cordless vacuum", "You will use it more, honestly", 500],
  ]),
  it("cleaning", "Utility", "Cleaning kit", "Mop, bucket, dustpan, brush, products.", [
    ["Thrifty", IKEA, "PEPPRIG dustpan and brush", "Gets you through week one", 38],
    ["Sensible", JL, "Vileda Turbo spin mop and bucket", "Wrings itself out", 65],
    ["Splurge", JL, "Joseph Joseph CleanStore broom set", "Stores flat, no wet mop in a corner", 110],
  ]),
  it("airer", "Utility", "Clothes airer", "Damp history in this flat, so this matters more than usual.", [
    ["Thrifty", IKEA, "FROST drying rack", "Folds flat", 22],
    ["Sensible", JL, "John Lewis ANYDAY 3 tier clothes airer", "More metres of line", 48],
    ["Splurge", JL, "Dry Soon heated airer with cover", "Dries overnight, cuts condensation", 130],
  ]),
  it("iron", "Utility", "Iron and board", "Only if you actually iron.", [
    ["Thrifty", IKEA, "DÄNKA ironing board", "Fine for shirts", 48],
    ["Sensible", JL, "Philips steam iron and John Lewis ironing board", "Better soleplate", 95],
    ["Splurge", JL, "Philips PerfectCare steam generator iron", "Faster, heavier, needs storing", 210],
  ]),
  it("storageboxes", "Utility", "Storage boxes", "For the cupboard and the things without a home.", [
    ["Thrifty", IKEA, "SAMLA box with lid clear", "See what is inside", 30],
    ["Sensible", IKEA, "TJENA storage box with lid", "Looks fine on a shelf", 55],
    ["Splurge", JL, "John Lewis seagrass storage basket", "Storage you leave on show", 120],
  ]),

  it("bulbs", "Practical", "Light bulbs", "Check every fitting on viewing day. 2700K throughout.", [
    ["Thrifty", IKEA, "SOLHETTA LED bulb warm white", "Warm white, cheap", 20],
    ["Sensible", IKEA, "TRÅDFRI dimmable LED bulb", "Needs dimmer switches", 40],
    ["Splurge", JL, "Philips Hue White and Colour starter kit", "Scenes and schedules", 130],
  ]),
  it("extension", "Practical", "Extension leads and adaptors", "Old flats never have sockets where you need them.", [
    ["Thrifty", JL, "John Lewis 4 gang extension lead", "Basic", 20],
    ["Sensible", JL, "Belkin surge protected extension lead with USB", "Charges phones without a plug", 45],
    ["Splurge", JL, "John Lewis surge protection extension with cable management", "Tidy behind the TV and desk", 80],
  ]),
  it("smartplugs", "Practical", "Smart plugs", "Lamps on a schedule when the flat is empty.", [
    ["Thrifty", JL, "TP Link Tapo smart plug", "App and voice control", 25],
    ["Sensible", JL, "TP Link Tapo smart plug 4 pack", "Enough for lamps and the airer", 45],
    ["Splurge", JL, "Philips Hue smart plug", "Ties into lighting later", 100],
  ]),
  it("firstaid", "Practical", "First aid kit", "Plasters, painkillers, antiseptic, thermometer.", [
    ["Thrifty", JL, "John Lewis first aid kit", "Covers the common stuff", 15],
    ["Sensible", JL, "St John Ambulance home first aid kit", "Somewhere to keep it all", 35],
    ["Splurge", JL, "John Lewis comprehensive first aid kit", "Includes a decent thermometer", 60],
  ]),
  it("torch", "Practical", "Torch and batteries", "For the fuse box, which is never anywhere sensible.", [
    ["Thrifty", IKEA, "LEDLJUS LED torch", "Keep it by the fuse box", 15],
    ["Sensible", JL, "John Lewis rechargeable LED torch", "Head torch for under the sink", 35],
    ["Splurge", JL, "LED Lenser rechargeable torch", "Power cut ready", 60],
  ]),
  it("safety", "Practical", "Smoke alarm, CO alarm, fire blanket", "Do this in week one, not month three.", [
    ["Thrifty", JL, "FireAngel smoke alarm and carbon monoxide alarm", "Legal minimum done", 32],
    ["Sensible", JL, "FireAngel smoke alarm and fire blanket", "Blanket goes near the hob", 58],
    ["Splurge", JL, "Google Nest Protect smoke and CO alarm", "Alerts your phone when you are out", 160],
  ]),

  it("drill", "Tools", "Drill", "You will hang a mirror, a spice rack and a knife rack in week one.", [
    ["Thrifty", IKEA, "FIXA cordless screwdriver", "Screws yes, masonry no", 25],
    ["Sensible", JL, "Bosch IXO cordless screwdriver", "Handles most walls", 75],
    ["Splurge", JL, "Bosch UniversalImpact 18V combi drill", "Goes into brick without complaint", 140],
  ]),
  it("tools", "Tools", "Tool kit and fixings", "Hammer, screwdrivers, spirit level, tape, plugs, picture hooks.", [
    ["Thrifty", IKEA, "FIXA 17 piece tool kit", "Covers flat pack", 20],
    ["Sensible", JL, "Stanley 38 piece home tool kit", "Proper handles", 45],
    ["Splurge", JL, "Bosch stud detector and tool set", "Finds pipes before the drill does", 85],
  ]),
  it("ladder", "Tools", "Step ladder", "For bulbs, curtain poles and the tops of wardrobes.", [
    ["Thrifty", IKEA, "BEKVÄM step stool", "Wood, two steps", 25],
    ["Sensible", JL, "John Lewis 3 step folding ladder", "Reaches a ceiling rose", 48],
    ["Splurge", JL, "John Lewis 4 step aluminium step ladder", "Stores in a cupboard gap", 85],
  ]),

  it("bbq", "Garden", "BBQ", "Charcoal for flavour, gas for weeknights.", [
    ["Thrifty", IKEA, "GRILLSKÄR charcoal barbecue", "Does a season or two", 60],
    ["Sensible", JL, "Weber Master Touch charcoal barbecue 57cm", "Charcoal, lid, lasts years", 250],
    ["Splurge", JL, "Weber Spirit II E210 gas barbecue", "Lit and cooking in ten minutes", 560],
  ]),
  it("watering", "Garden", "Watering can and hose", "Nicola's mower is already coming to you.", [
    ["Thrifty", IKEA, "VATTENKRASSE watering can", "Metal, small", 15],
    ["Sensible", JL, "Hozelock 15m hose and reel", "Reaches the whole garden", 55],
    ["Splurge", JL, "Hozelock Auto Reel wall mounted hose", "Retracts itself", 125],
  ]),
  it("gardentools", "Garden", "Garden tools", "Depends how much garden you have actually got.", [
    ["Thrifty", JL, "John Lewis garden trowel and fork set", "Pot and border level", 25],
    ["Sensible", JL, "Spear and Jackson garden tool set", "Real garden kit", 75],
    ["Splurge", JL, "Felco secateurs and garden tool set", "Sharpenable, lifetime tools", 150],
  ]),
  it("outdoorstore", "Garden", "Outdoor storage", "Somewhere for cushions, charcoal and tools.", [
    ["Thrifty", JL, "Keter outdoor storage box", "Waterproof, ugly", 40],
    ["Sensible", IKEA, "TOSTERÖ storage bag for garden furniture", "Doubles as a bench", 95],
    ["Splurge", JL, "John Lewis garden storage bench", "Seating and storage in one", 210],
  ]),
  it("outdoorlight", "Garden", "Outdoor lighting", "Turns the garden into a room you use after 8pm.", [
    ["Thrifty", IKEA, "SOLVINDEN solar powered string light", "No wiring, no plug", 25],
    ["Sensible", JL, "John Lewis festoon garden lights", "Mains powered, brighter", 70],
    ["Splurge", JL, "John Lewis outdoor wall and path lights", "Properly lit garden", 180],
  ]),
];

export const ROOMS = [...new Set(ITEMS.map((i) => i.room))];

export const ALREADY = [
  "Beds and mattresses",
  "Desk",
  "Office chair",
  "Chest of drawers",
  "Dining table and chairs",
  "Garden furniture",
  "Clothes rack",
  "VIMLE sofa",
  "BESTÅ TV bench",
  "Plates, glasses, mugs",
];

/* Retailer search page, used as the card's link when the scraper could
   not resolve a real product URL. Defined in retailers.js so adding a
   shop is one entry in one file. */
export { searchUrl } from "./retailers.js";

/* Stable key for one option, shared by the app, the scraper and the
   overrides file. Changing this format invalidates products.json. */
export const optionKey = (itemId, optionIndex) => `${itemId}:${optionIndex}`;

/* Every option flattened, in scrape order. */
export const ALL_OPTIONS = ITEMS.flatMap((item) =>
  item.options.map((option, index) => ({
    key: optionKey(item.id, index),
    itemId: item.id,
    optionIndex: index,
    room: item.room,
    itemName: item.name,
    ...option,
  }))
);
