// LEVERA — more lines per brand so each house has a full 40 pieces (same format as brands.mjs).
const F = (shape, juice, cap = 'black', glass = '#ffffff') => ({ shape, juice, cap, glass });

export const MORE = {
  'dior': [
    ['Dior Homme Parfum', 'perfume', 1150, [['100 ml',1150]], F('rect','#4A3A2C','black','#6B5A4A')],
    ['Fahrenheit Eau de Toilette', 'perfume', 690, [['100 ml',690]], F('facet','#B8562A','black','#D98A5E')],
    ['Hypnotic Poison Eau de Toilette', 'perfume', 780, [['100 ml',780]], F('flask','#7A1E2A','gold')],
    ['Dior Oblique Jacquard T-shirt', 'tee', 6600, 'navy white'],
    ['CD Icon Hoodie', 'hoodie', 9800, 'black grey'],
    ['Saddle Belt Bag', 'waistbag', 18500, 'black'],
    ['DiorSoLight1 Sunglasses', 'sunglasses', 2900, 'black'],
    ['CD Icon Leather Belt', 'belt', 4600, 'black'],
    ['Oblique Wool Beanie', 'beanie', 3600, 'navy']
  ],
  'louis-vuitton': [
    ['Monogram Eclipse Discovery Bumbag', 'waistbag', 16500, 'black'],
    ['LV Millionaires Sunglasses', 'sunglasses', 5800, 'black'],
    ['Monogram Get Ready Cap', 'cap', 3900, 'black beige'],
    ['Zippy Wallet', 'wallet', 7200, 'monogram']
  ],
  'cartier': [
    ['Trinity Bracelet', 'bracelet', 21500, 'yellowgold'],
    ['Panthère de Cartier Ring', 'ring', 48000, 'yellowgold'],
    ['Clash de Cartier Earrings', 'earrings', 26000, 'rosegold'],
    ['Tank Française Watch, Small', 'watch', 42000, 'silver'],
    ['Panthère Sunglasses', 'sunglasses', 7500, 'gold'],
    ['Ecrou de Cartier Ring', 'ring', 12500, 'yellowgold rosegold']
  ],
  'celine': [
    ['Triomphe Silk Scarf', 'scarf', 3800, 'black tan'],
    ['Teddy Varsity Jacket', 'jacket', 26000, 'black navy'],
    ['Celine Paris Hoodie', 'hoodie', 7600, 'black'],
    ['Triomphe Canvas Backpack', 'backpack', 22500, 'tan'],
    ['Triomphe Leather Loafers', 'loafer', 6900, 'black tan']
  ],
  'burberry': [
    ['Vintage Check Cotton Shirt', 'shirt', 4800, 'beige'],
    ['Check Cotton Polo Shirt', 'polo', 3600, 'black white navy'],
    ['Cashmere Sweater', 'knit', 8900, 'beige navy'],
    ['Check Quilted Jacket', 'puffer', 11800, 'beige'],
    ['Box Leather Sneakers', 'sneaker', 5600, 'white black'],
    ['Check Leather Belt', 'belt', 3600, 'check black'],
    ['Check Bucket Hat', 'cap', 2600, 'check'],
    ['Square Frame Sunglasses', 'sunglasses', 1900, 'black'],
    ['Rocking Horse Bag', 'crossbody', 15500, 'black']
  ],
  'ysl-beauty': [
    ['Libre Flowers & Flames', 'perfume', 1050, [['90 ml',1050]], F('square','#F0A770','gold')],
    ['L’Homme Eau de Toilette', 'perfume', 720, [['100 ml',720],['60 ml',560]], F('tall','#8C8F96','black','#C7CACF')],
    ['Opium Eau de Parfum', 'perfume', 990, [['90 ml',990]], F('column','#8E1E1E','gold')],
    ['Loveshine Lip Oil Stick', 'lipstick', 310, [['44 Nude Lavalliere',310,'beige'],['150 Nude Self',310,'pink']]],
    ['Make Me Blush', 'beauty', 340, [['37 Coral',340,'orange'],['24 Pink',340,'pink']]]
  ],
  'versace': [
    ['Tie-Dye Barocco T-shirt', 'tee', 4200, 'multi'],
    ['La Greca Signature Sneaker', 'sneaker', 5400, 'white'],
    ['Medusa Biggie Cap', 'cap', 2100, 'black white'],
    ['Barocco Silk Scarf', 'scarf', 2600, 'black gold'],
    ['Medusa Slides', 'slide', 2900, 'black white'],
    ['Medusa Head Ring', 'ring', 3200, 'gold'],
    ['Medusa Chain Necklace', 'necklace', 4800, 'gold'],
    ['Greca Wallet', 'wallet', 3400, 'black']
  ],
  'valentino': [
    ['VLogo Leather Sneakers', 'sneaker', 5200, 'white'],
    ['Roman Stud Small Bag', 'handbag', 22500, 'black pink'],
    ['VLogo Baseball Cap', 'cap', 2400, 'black'],
    ['VLogo Cashmere Beanie', 'beanie', 3100, 'black'],
    ['VLogo Signature Hoodie', 'hoodie', 6900, 'black'],
    ['Rockstud Slides', 'slide', 3900, 'black'],
    ['VLogo Signature Earrings', 'earrings', 3600, 'gold'],
    ['Valentino Donna Eau de Parfum', 'perfume', 820, [['100 ml',820]], F('rect','#E7C0A0','gold')],
    ['Born in Roma Yellow Dream', 'perfume', 860, [['100 ml',860]], F('column','#F0CC56','gold')]
  ],
  'maison-margiela': [
    ['Replica Autumn Vibes', 'perfume', 820, [['100 ml',820]], F('column','#9A6B3A','black','#E8E1D4')],
    ['Replica Sailing Day', 'perfume', 820, [['100 ml',820]], F('column','#BFD9E8','black','#F5F1EA')],
    ['Replica Matcha Meditation', 'perfume', 820, [['100 ml',820]], F('column','#A8BE7A','black','#F5F1EA')],
    ['Tabi Split-Toe Loafers', 'loafer', 7200, 'black'],
    ['Four Stitches Logo Hoodie', 'hoodie', 5800, 'black grey'],
    ['5AC Micro Bag', 'crossbody', 9800, 'black'],
    ['Numbers Knit Beanie', 'beanie', 2300, 'black'],
    ['Distressed Knit Sweater', 'knit', 7600, 'grey']
  ],
  'comme-des-garcons': [
    ['PLAY Heart Zip Hoodie', 'zip', 2350, 'grey'],
    ['PLAY Sweatpants', 'sweatpants', 1650, 'black'],
    ['PLAY Knit Beanie', 'beanie', 980, 'black navy'],
    ['Wallet Huge Logo Zip', 'wallet', 1450, 'black'],
    ['Homme Plus Wool Blazer', 'coat', 8900, 'black'],
    ['CDG Logo Tote', 'tote', 1250, 'black']
  ],
  'moncler': [
    ['Grenoble Logo Fleece', 'zip', 4800, 'black'],
    ['Logo Sweatpants', 'sweatpants', 3300, 'black navy'],
    ['Trailgrip Sneakers', 'sneaker', 4200, 'black white'],
    ['Monte Runner', 'runner', 3800, 'white'],
    ['Logo Cashmere Beanie', 'beanie', 3300, 'cream'],
    ['Kilia Small Crossbody', 'crossbody', 6800, 'black'],
    ['Tech Backpack', 'backpack', 5600, 'black'],
    ['Wool Scarf', 'scarf', 2900, 'navy grey']
  ],
  'chrome-hearts': [
    ['Horseshoe Zip Hoodie Thermal', 'zip', 9200, 'grey'],
    ['Cross Logo Shorts', 'shorts', 4200, 'black'],
    ['Forever Ring', 'ring', 3400, 'sterling'],
    ['Cross Ball Bracelet', 'bracelet', 9600, 'sterling'],
    ['Fancy Chain Link Bracelet', 'bracelet', 14500, 'sterling'],
    ['Dagger Pendant', 'necklace', 6200, 'sterling'],
    ['CH Cross Hoop Earrings', 'earrings', 4600, 'sterling'],
    ['Script Logo T-shirt', 'tee', 3300, 'black white grey'],
    ['Malibu Horseshoe T-shirt', 'tee', 3500, 'white black'],
    ['Cemetery Long Sleeve', 'longsleeve', 4500, 'black'],
    ['Cross Patch Denim', 'jeans', 26000, 'blackdenim midwash'],
    ['Cross Patch Beanie', 'beanie', 3100, 'black'],
    ['Leather Cross Belt', 'belt', 16500, 'black'],
    ['Bubble Gum Sunglasses', 'sunglasses', 8900, 'black']
  ],
  'enfants-riches-deprimes': [
    ['Logo Wool Scarf', 'scarf', 3900, 'black grey'],
    ['Painted Leather Belt', 'belt', 4800, 'black'],
    ['Classic Logo Shorts', 'shorts', 4800, 'black grey'],
    ['Leather Biker Jacket', 'jacket', 36000, 'black'],
    ['Distressed Denim Jacket', 'workjacket', 14500, 'blackdenim'],
    ['Cashmere Knit Sweater', 'knit', 12500, 'black grey'],
    ['Flannel Overshirt', 'shirt', 7200, 'navy'],
    ['Thrashed Tote Bag', 'tote', 5600, 'black']
  ],
  'stone-island': [
    ['Shadow Project Hoodie', 'hoodie', 5600, 'black'],
    ['Garment-Dyed Polo', 'polo', 1650, 'navy white'],
    ['Lambswool Knit Sweater', 'knit', 3400, 'navy olive']
  ],
  'ralph-lauren': [
    ['Polo Bear T-shirt', 'tee', 680, 'white navy'],
    ['Quilted Jacket', 'puffer', 2600, 'navy black'],
    ['Corduroy Trousers', 'pants', 1150, 'brown navy']
  ],
  'arcteryx': [
    ['Heliad 15 Backpack', 'backpack', 980, 'black'],
    ['Proton Hoody', 'jacket', 2900, 'black'],
    ['Squamish Hoody', 'jacket', 1550, 'black']
  ],
  'supreme': [
    ['Bandana Box Logo Hoodie', 'hoodie', 3900, 'black'],
    ['Arc Logo Crewneck', 'crew', 1650, 'grey'],
    ['Small Box Shorts', 'shorts', 980, 'black'],
    ['Bandana Logo Crusher Hat', 'cap', 680, 'black']
  ],
  'bape': [
    ['Shark Crewneck', 'crew', 2200, 'black grey'],
    ['ABC Camo Backpack', 'backpack', 2400, 'green'],
    ['Bape Sta Slides', 'slide', 980, 'black white'],
    ['Shark Track Pants', 'sweatpants', 1650, 'black navy'],
    ['Milo T-shirt', 'tee', 760, 'white'],
    ['Logo Shoulder Bag', 'crossbody', 1150, 'black']
  ],
  'corteiz': [
    ['Alcatraz Long Sleeve', 'longsleeve', 720, 'black'],
    ['Bolo Hoodie', 'hoodie', 1600, 'black grey'],
    ['Guerillaz Shorts', 'shorts', 980, 'khaki black'],
    ['Corteiz x Nike Air Max 95 Pink Beam', 'sneaker', 2300, 'pink'],
    ['RTW Polo Shirt', 'polo', 880, 'white']
  ],
  'nocta': [
    ['Tech Fleece Crewneck', 'crew', 980, 'black grey'],
    ['Basketball Jersey', 'tee', 620, 'black white'],
    ['Glide Fleece Hoodie', 'hoodie', 1050, 'navy'],
    ['Opal Fleece Jacket', 'zip', 1350, 'black'],
    ['Waist Bag', 'waistbag', 480, 'black'],
    ['Long Sleeve Mock Neck', 'longsleeve', 620, 'black white'],
    ['Woven Track Jacket', 'jacket', 1350, 'grey']
  ],
  'hba': [
    ['Logo Sweatshirt Oversized', 'crew', 1950, 'white grey'],
    ['Flame Logo T-shirt', 'tee', 1150, 'black white'],
    ['Shrunken Logo Hoodie', 'hoodie', 2300, 'black'],
    ['Distressed Denim', 'jeans', 2600, 'blackdenim midwash'],
    ['Leather Jacket', 'jacket', 9800, 'black'],
    ['Logo Polo', 'polo', 1350, 'black white'],
    ['Graphic Long Sleeve', 'longsleeve', 1350, 'black white'],
    ['Logo Backpack', 'backpack', 1650, 'black'],
    ['Logo Belt', 'belt', 980, 'black']
  ],
  'carhartt': [
    ['Car-Lux Jacket', 'workjacket', 1450, 'black brown'],
    ['Nimbus Pullover', 'jacket', 1150, 'black navy'],
    ['Chore Coat', 'workjacket', 1850, 'brown'],
    ['Script Hoodie', 'hoodie', 680, 'grey black'],
    ['Logo Belt', 'belt', 320, 'black']
  ],
  'nike': [
    ['Air Max Plus', 'sneaker', 1050, 'black'],
    ['P-6000', 'sneaker', 760, 'silver']
  ],
  'adidas': [
    ['Adizero SL2', 'runner', 690, 'black'],
    ['Spezial Track Top', 'jacket', 620, 'navy']
  ],
  'converse': [
    ['Chuck 70 Plus', 'sneaker', 620, 'black white'],
    ['Run Star Legacy CX', 'sneaker', 650, 'black white'],
    ['Chuck Taylor Lugged 2.0', 'sneaker', 560, 'black white'],
    ['Chuck 70 Canvas Mule', 'slide', 450, 'black cream'],
    ['Chuck 70 Marquis', 'sneaker', 580, 'black white'],
    ['Go-To Star Chevron Cap', 'cap', 180, 'black white'],
    ['Star Chevron T-shirt', 'tee', 160, 'black white']
  ],
  'levis': [
    ['Classic Fit Oxford Shirt', 'shirt', 360, 'white lightblue'],
    ['XX Chino Standard Taper', 'pants', 420, 'khaki black'],
    ['Housemark Logo Cap', 'cap', 180, 'black navy']
  ],
  'zara': [
    ['Cropped Puffer Jacket', 'puffer', 560, 'black'],
    ['Leather Loafers', 'loafer', 520, 'black brown'],
    ['Faux Fur Bucket Hat', 'cap', 180, 'black'],
    ['Leather Crossbody Bag', 'crossbody', 380, 'black brown']
  ],
  'balenciaga': [
    ['Destroyed Skater Sweatpants', 'sweatpants', 6800, 'black grey'],
    ['Le Cagole Mini Bag', 'crossbody', 15800, 'black pink'],
    ['Track Slides', 'slide', 3600, 'black'],
    ['Logo Wool Beanie', 'beanie', 2600, 'black'],
    ['Hourglass Wallet on Chain', 'wallet', 9800, 'black'],
    ['Dynasty Hoodie', 'hoodie', 8200, 'black grey'],
    ['Skiwear Puffer Jacket', 'puffer', 18500, 'black'],
    ['Cash Mini Wallet', 'wallet', 3600, 'black'],
    ['Paris Logo Sunglasses', 'sunglasses', 3600, 'black']
  ],
  'acne-studios': [
    ['Face Patch Polo', 'polo', 1650, 'navy'],
    ['Bla Konst Long Sleeve', 'longsleeve', 1650, 'black white'],
    ['Logo Sweatpants', 'sweatpants', 2400, 'grey black'],
    ['Oversized Wool Coat', 'coat', 9800, 'camel black'],
    ['Face Logo Tote', 'tote', 1650, 'black'],
    ['Chunky Knit Cardigan', 'knit', 3900, 'cream'],
    ['Leather Belt', 'belt', 2200, 'black']
  ]
};
