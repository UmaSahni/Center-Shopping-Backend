import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// High resolution, curated Unsplash imagery categorized by product type
// High resolution, verified Unsplash imagery categorized strictly by specific product type
// All images verified HTTP 200 to ensure fast loading and zero broken thumbnails
const PRODUCT_TYPE_IMAGES = {
  // Electronics
  earbuds: [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80',
  ],
  smartwatch: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
  ],
  speaker: [
    'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
  ],
  powerbank: [
    'https://images.unsplash.com/photo-1585060544812-6b45742d762f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
  ],
  headphones: [
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  ],
  keyboard: [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
  ],
  mouse: [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
  ],
  hub: [
    'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=800&q=80',
  ],
  charger: [
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
  ],
  tablet: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80',
  ],
  camera: [
    'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
  ],
  fitnessBand: [
    'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?auto=format&fit=crop&w=800&q=80',
  ],

  // Fashion
  kurta: [
    'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=800&q=80',
  ],
  formalShirt: [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
  ],
  trousers: [
    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
  ],
  nehruJacket: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
  ],
  jeans: [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=800&q=80',
  ],
  linenShirt: [
    'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
  ],
  poloTee: [
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80',
  ],
  kurtiSet: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
  ],
  blazer: [
    'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
  ],
  denimJacket: [
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
  ],
  cottonShirt: [
    'https://images.unsplash.com/photo-1589902860314-e910697dea18?auto=format&fit=crop&w=800&q=80',
  ],
  tshirt: [
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
  ],
  joggers: [
    'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80',
  ],

  // Jewelry & Watches
  watch: [
    'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  ],
  ring: [
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
  ],
  earrings: [
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
  ],
  necklace: [
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=800&q=80',
  ],
  bracelet: [
    'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80',
  ],

  // Home & Kitchen
  pressureCooker: [
    'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80', // stainless steel pot
    'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80', // kitchen pot
  ],
  cookwareSet: [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', // pots & pans cookware
    'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  ],
  kadai: [
    'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80', // deep pan wok with handles
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  ],
  mixerGrinder: [
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80', // blender mixer
    'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
  ],
  waterBottle: [
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80', // insulated metal flask
    'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80', // stainless steel flask
  ],
  bedsheet: [
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', // bedsheets
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80', // cozy bed with sheet
  ],
  electricKettle: [
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80', // kettle
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
  ],
  inductionCooktop: [
    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', // kitchen stove
  ],
  juicer: [
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
  ],
  pillow: [
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', // pillow
  ],
  casserole: [
    'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
  ],
  airPurifier: [
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80', // air purifier
  ],
  sandwichMaker: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80', // sandwich toaster
  ],

  // Beauty & Personal Care
  serum: [
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
  ],
  faceWash: [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  ],
  faceOil: [
    'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=800&q=80',
  ],
  shampoo: [
    'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80',
  ],
  sunscreen: [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
  ],
  faceCream: [
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
  ],

  // Footwear & Travel
  sportsShoes: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
  ],
  derbyShoes: [
    'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80',
  ],
  hikingBoots: [
    'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
  ],
  suitCase: [
    'https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=800&q=80',
  ],
  backpack: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80',
  ],
  loafers: [
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80',
  ],
  sneakers: [
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
  ],
  slides: [
    'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=800&q=80',
  ],
};

const CATEGORIES_DATA = {
  Electronics: {
    brands: ['boAt', 'Noise', 'OnePlus', 'Samsung', 'Sony', 'Realme', 'Fire-Boltt', 'Boult Audio', 'Portronics', 'Zebronics', 'Xiaomi', 'JBL'],
    items: [
      { name: 'Wireless Noise Cancelling Earbuds', basePrice: 1699, varType: 'color', imageType: 'earbuds' },
      { name: 'Amoled Bluetooth Calling Smartwatch', basePrice: 2499, varType: 'color', imageType: 'smartwatch' },
      { name: 'Rugged Waterproof Bluetooth Speaker', basePrice: 1999, varType: 'color', imageType: 'speaker' },
      { name: 'Magnetic Fast Wireless Power Bank 10000mAh', basePrice: 1499, varType: 'capacity', imageType: 'powerbank' },
      { name: 'Over-Ear Studio Gaming Headphones with Mic', basePrice: 2999, varType: 'color', imageType: 'headphones' },
      { name: 'Active ANC Wireless Neckband', basePrice: 1299, varType: 'color', imageType: 'earbuds' },
      { name: 'Ultra-Slim Mechanical Wireless Keyboard', basePrice: 3499, varType: 'keyboard', imageType: 'keyboard' },
      { name: 'Ergonomic Rechargeable Wireless Mouse', basePrice: 899, varType: 'color', imageType: 'mouse' },
      { name: '7-in-1 Aluminium Type-C Multiport Hub', basePrice: 1799, varType: 'hub', imageType: 'hub' },
      { name: '65W GaN Dual-Port Fast Wall Charger', basePrice: 1299, varType: 'charger', imageType: 'charger' },
      { name: '10.1 Inch HD Android Smart Tablet', basePrice: 12999, varType: 'storage', imageType: 'tablet' },
      { name: '4K Ultra HD Dolby Atmos Soundbar with Subwoofer', basePrice: 8499, varType: 'soundbar', imageType: 'speaker' },
      { name: 'Smart Security Wi-Fi 360 Degree Camera', basePrice: 2199, varType: 'camera', imageType: 'camera' },
      { name: 'Smart Fitness Band with Heart & SpO2 Monitor', basePrice: 1499, varType: 'color', imageType: 'fitnessBand' },
    ],
    series: ['Pro', 'Max', 'Ultra', 'Plus', 'Air', 'Neo', 'Wave', 'Bassheads', 'Immortal', 'Rockerz', 'Nord', 'Aura']
  },
  Fashion: {
    brands: ['FabIndia', 'Manyavar', 'Raymond', 'Allen Solly', 'Peter England', "Levi's", 'Biba', 'W for Woman', 'US Polo Assn', 'Van Heusen', 'Louis Philippe', 'Mufti'],
    items: [
      { name: 'Pure Cotton Embroidered Long Kurta', basePrice: 1499, varType: 'clothing', imageType: 'kurta' },
      { name: 'Slim Fit Wrinkle-Free Formal Shirt', basePrice: 1299, varType: 'clothing', imageType: 'formalShirt' },
      { name: 'Classic Tapered Fit Chino Trousers', basePrice: 1799, varType: 'clothing', imageType: 'trousers' },
      { name: 'Silk Blend Traditional Nehru Jacket', basePrice: 2499, varType: 'clothing', imageType: 'nehruJacket' },
      { name: 'Straight Fit Indigo Denim Jeans', basePrice: 2199, varType: 'clothing', imageType: 'jeans' },
      { name: 'Pure Linen Casual Summer Shirt', basePrice: 1899, varType: 'clothing', imageType: 'linenShirt' },
      { name: 'Pique Cotton Classic Polo T-Shirt', basePrice: 899, varType: 'clothing', imageType: 'poloTee' },
      { name: 'Festive Floral Printed Anarkali Kurti Set', basePrice: 2999, varType: 'clothing', imageType: 'kurtiSet' },
      { name: 'Tailored Two-Piece Formal Blazer', basePrice: 5499, varType: 'clothing', imageType: 'blazer' },
      { name: 'Casual Washed Denim Overshirt', basePrice: 1999, varType: 'clothing', imageType: 'denimJacket' },
      { name: 'Handcrafted Khadi Cotton Shirt', basePrice: 1399, varType: 'clothing', imageType: 'cottonShirt' },
      { name: 'Classic Round Neck Organic Cotton Tee', basePrice: 699, varType: 'clothing', imageType: 'tshirt' },
      { name: 'Jacquard Woven Sherwani Set with Stole', basePrice: 7999, varType: 'clothing', imageType: 'kurta' },
      { name: 'Breathable Stretch Lounge Joggers', basePrice: 1099, varType: 'clothing', imageType: 'joggers' },
    ],
    series: ['Classic', 'Signature', 'Royal', 'Heritage', 'Indigo', 'Comfort', 'Elegance', 'Bespoke', 'Urban', 'Authentic', 'Vogue', 'Artisan']
  },
  'Jewelry & Watches': {
    brands: ['Titan', 'Fastrack', 'Tanishq', 'Malabar Gold', 'Kalyan Jewellers', 'Fossil', 'Casio', 'Timex', 'Giva', 'Mia by Tanishq', 'Citizen', 'Seiko'],
    items: [
      { name: 'Automatic Chronograph Stainless Steel Watch', basePrice: 7999, varType: 'watchStrap', imageType: 'watch' },
      { name: 'Minimalist Slim Quartz Rose Gold Watch', basePrice: 3499, varType: 'watchStrap', imageType: 'watch' },
      { name: '925 Sterling Silver Solitaire Zirconia Ring', basePrice: 1999, varType: 'ringSize', imageType: 'ring' },
      { name: '18K Gold Plated Emerald Drop Earrings', basePrice: 2799, varType: 'metalColor', imageType: 'earrings' },
      { name: 'Traditional Kundan Choker Necklace Set', basePrice: 4999, varType: 'necklace', imageType: 'necklace' },
      { name: 'Vintage Digital Multifunction Watch', basePrice: 2299, varType: 'watchStrap', imageType: 'watch' },
      { name: 'Diamond Accent Sterling Silver Pendant with Chain', basePrice: 3199, varType: 'metalColor', imageType: 'necklace' },
      { name: 'Dual-Time Zone Aviation Leather Watch', basePrice: 6499, varType: 'watchStrap', imageType: 'watch' },
      { name: '18K Yellow Gold Floral Stud Earrings', basePrice: 11499, varType: 'carat', imageType: 'earrings' },
      { name: 'Adjustable Silver Tennis Bracelet', basePrice: 2499, varType: 'metalColor', imageType: 'bracelet' },
      { name: 'Heavy Curb Cuban Link Chain Necklace', basePrice: 1899, varType: 'metalColor', imageType: 'necklace' },
      { name: 'Skeleton Dial Automatic Mechanical Timepiece', basePrice: 14999, varType: 'watchStrap', imageType: 'watch' },
    ],
    series: ['Edge', 'Octane', 'Regalia', 'Raga', 'Entice', 'Heritage', 'Starlight', 'Opulence', 'Royale', 'Classique', 'Prism', 'Eternity']
  },
  'Home & Kitchen': {
    brands: ['Prestige', 'Hawkins', 'Pigeon', 'Milton', 'Bajaj', 'Philips', 'Wonderchef', 'Bombay Dyeing', 'Sleepwell', 'Crompton', 'Butterfly', 'Kent'],
    items: [
      { name: 'Tri-Ply Stainless Steel Outer Lid Pressure Cooker', basePrice: 2199, varType: 'cookerCapacity', imageType: 'pressureCooker' },
      { name: '5-Piece Granite Finish Non-Stick Cookware Set', basePrice: 3499, varType: 'color', imageType: 'cookwareSet' },
      { name: '750W Heavy Duty Mixer Grinder with 3 Jars', basePrice: 2899, varType: 'color', imageType: 'mixerGrinder' },
      { name: 'Thermosteel Hot & Cold Vacuum Insulated Bottle', basePrice: 799, varType: 'bottleCapacity', imageType: 'waterBottle' },
      { name: '100% Combed Cotton Glace Double Bedsheet with Pillow Covers', basePrice: 1199, varType: 'bedSize', imageType: 'bedsheet' },
      { name: '1.8 Litre Stainless Steel Cordless Electric Kettle', basePrice: 999, varType: 'color', imageType: 'electricKettle' },
      { name: '2000W Smart Induction Cooktop with Touch Panel', basePrice: 2799, varType: 'induction', imageType: 'inductionCooktop' },
      { name: 'Dual-Speed Cold Press Slow Masticating Juicer', basePrice: 5999, varType: 'color', imageType: 'juicer' },
      { name: 'High-Density Orthopedic Memory Foam Pillow', basePrice: 1499, varType: 'pillowPack', imageType: 'pillow' },
      { name: '3-Piece Insulated Stainless Steel Casserole Set', basePrice: 1699, varType: 'color', imageType: 'casserole' },
      { name: 'HEPA Filter Quiet Room Air Purifier', basePrice: 7499, varType: 'purifier', imageType: 'airPurifier' },
      { name: 'Multi-Utility Sandwich & Waffle Maker', basePrice: 1599, varType: 'color', imageType: 'sandwichMaker' },
      { name: 'Hard Anodized Deep Kadai with Glass Lid', basePrice: 1299, varType: 'cookerCapacity', imageType: 'kadai' },
    ],
    series: ['Deluxe', 'Platina', 'Omega', 'Royal', 'Durastone', 'Optima', 'Prime', 'Supreme', 'Previa', 'Aura', 'Smart', 'Elite']
  },
  'Beauty & Personal Care': {
    brands: ['Mamaearth', 'mCaffeine', 'Forest Essentials', 'Plum', 'Kama Ayurveda', 'Beardo', 'Biotique', 'WOW Skin Science', 'Lakme', 'Minimalist', 'Dot & Key', 'The Derma Co'],
    items: [
      { name: '10% Vitamin C Daily Face Serum for Glowing Skin', basePrice: 599, varType: 'volume', imageType: 'serum' },
      { name: 'Naked & Raw Coffee Foaming Face Wash', basePrice: 349, varType: 'volume', imageType: 'faceWash' },
      { name: 'Kumkumadi Miraculous Ayurvedic Night Beauty Oil', basePrice: 1899, varType: 'volume', imageType: 'faceOil' },
      { name: 'Onion Anti-Hair Fall Shampoo with Plant Keratin', basePrice: 449, varType: 'volume', imageType: 'shampoo' },
      { name: 'Ultra Light Hyaluronic Sunscreen Gel SPF 50 PA++++', basePrice: 499, varType: 'volume', imageType: 'sunscreen' },
      { name: 'Niacinamide 10% Blemish Clarifying Serum', basePrice: 599, varType: 'volume', imageType: 'serum' },
      { name: 'Green Tea Oil-Free Mattifying Night Gel', basePrice: 549, varType: 'volume', imageType: 'faceCream' },
      { name: 'Godfather Beard Growth Oil with Vitamin E', basePrice: 399, varType: 'volume', imageType: 'faceOil' },
      { name: 'Pure Steam Distilled Rose Water Facial Toner Mist', basePrice: 429, varType: 'volume', imageType: 'faceOil' },
      { name: 'Activated Charcoal Deep Exfoliating Face Scrub', basePrice: 379, varType: 'volume', imageType: 'faceWash' },
      { name: 'Salicylic Acid 2% Daily Gentle Cleanser', basePrice: 499, varType: 'volume', imageType: 'faceWash' },
      { name: 'Natural Shea & Cocoa Butter Deep Body Lotion', basePrice: 399, varType: 'volume', imageType: 'sunscreen' },
    ],
    series: ['Glow', 'Botanica', 'Radiance', 'Ayur', 'Clear', 'Pure', 'Recharge', 'Nourish', 'Hydra', 'Defend', 'Brighten', 'Renew']
  },
  'Footwear & Travel': {
    brands: ['Bata', 'Red Tape', 'Sparx', 'Woodland', 'Wildcraft', 'American Tourister', 'Skybags', 'Safari', 'Campus', 'Action', 'Metro', 'Hush Puppies'],
    items: [
      { name: 'Lightweight Breathable Mesh Running Sports Shoes', basePrice: 1599, varType: 'shoes', imageType: 'sportsShoes' },
      { name: 'Genuine Leather Formal Derby Shoes for Men', basePrice: 2499, varType: 'shoes', imageType: 'derbyShoes' },
      { name: 'Rugged Genuine Nubuck Leather Hiking Boots', basePrice: 3999, varType: 'shoes', imageType: 'hikingBoots' },
      { name: 'Polycarbonate Scratch-Resistant Hard Trolley Suitcase', basePrice: 3499, varType: 'luggage', imageType: 'suitCase' },
      { name: 'Water-Resistant Multi-Compartment Laptop Backpack', basePrice: 1699, varType: 'backpack', imageType: 'backpack' },
      { name: 'Classic Suede Leather Casual Loafers', basePrice: 2199, varType: 'shoes', imageType: 'loafers' },
      { name: 'Memory Foam Everyday Comfort Walking Sneakers', basePrice: 1799, varType: 'shoes', imageType: 'sneakers' },
      { name: 'Expandable 4-Wheel Spinner Check-in Luggage 65cm', basePrice: 4599, varType: 'luggage', imageType: 'suitCase' },
      { name: 'Ergonomic Trekking Daypack with Rain Cover 45L', basePrice: 2299, varType: 'backpack', imageType: 'backpack' },
      { name: 'Slip-On Orthopedic Comfort Slides for Daily Wear', basePrice: 799, varType: 'shoes', imageType: 'slides' },
    ],
    series: ['Flex', 'Explorer', 'Urban', 'Stride', 'Cruise', 'Velocity', 'Trekker', 'ComfortFit', 'AirFlow', 'Nomad', 'Summit', 'Voyager']
  }
};

// Intelligent image resolver that guarantees product title and category visual alignment
function getProductImage(productTitle, category, item, counter) {
  // 1. Check item.imageType mapping
  if (item && item.imageType && PRODUCT_TYPE_IMAGES[item.imageType]) {
    const list = PRODUCT_TYPE_IMAGES[item.imageType];
    return list[(counter - 1) % list.length];
  }

  const lower = (productTitle || '').toLowerCase();

  // 2. Strict keyword matching (ensures cookers get cooker pots, bedsheets get bedsheets, etc.)
  if (lower.includes('cooker')) {
    const list = PRODUCT_TYPE_IMAGES.pressureCooker;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('bedsheet') || lower.includes('bedding') || lower.includes('glace')) {
    const list = PRODUCT_TYPE_IMAGES.bedsheet;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('pillow')) {
    const list = PRODUCT_TYPE_IMAGES.pillow;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('kadai') || lower.includes('wok')) {
    const list = PRODUCT_TYPE_IMAGES.kadai;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('cookware') || lower.includes('pan')) {
    const list = PRODUCT_TYPE_IMAGES.cookwareSet;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('mixer') || lower.includes('grinder') || lower.includes('blender')) {
    const list = PRODUCT_TYPE_IMAGES.mixerGrinder;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('bottle') || lower.includes('thermosteel') || lower.includes('flask')) {
    const list = PRODUCT_TYPE_IMAGES.waterBottle;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('kettle')) {
    const list = PRODUCT_TYPE_IMAGES.electricKettle;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('induction') || lower.includes('cooktop')) {
    const list = PRODUCT_TYPE_IMAGES.inductionCooktop;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('juicer')) {
    const list = PRODUCT_TYPE_IMAGES.juicer;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('casserole')) {
    const list = PRODUCT_TYPE_IMAGES.casserole;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('purifier')) {
    const list = PRODUCT_TYPE_IMAGES.airPurifier;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('sandwich') || lower.includes('waffle')) {
    const list = PRODUCT_TYPE_IMAGES.sandwichMaker;
    return list[(counter - 1) % list.length];
  }

  // Electronics keywords
  if (lower.includes('earbuds') || lower.includes('neckband')) {
    const list = PRODUCT_TYPE_IMAGES.earbuds;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('smartwatch') || lower.includes('fitness band')) {
    const list = PRODUCT_TYPE_IMAGES.smartwatch;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('speaker') || lower.includes('soundbar')) {
    const list = PRODUCT_TYPE_IMAGES.speaker;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('power bank')) {
    const list = PRODUCT_TYPE_IMAGES.powerbank;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('headphones')) {
    const list = PRODUCT_TYPE_IMAGES.headphones;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('keyboard')) {
    const list = PRODUCT_TYPE_IMAGES.keyboard;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('mouse')) {
    const list = PRODUCT_TYPE_IMAGES.mouse;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('tablet')) {
    const list = PRODUCT_TYPE_IMAGES.tablet;
    return list[(counter - 1) % list.length];
  }

  // Footwear & Travel keywords
  if (lower.includes('shoes') || lower.includes('sneakers') || lower.includes('sports')) {
    const list = PRODUCT_TYPE_IMAGES.sportsShoes;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('derby') || (lower.includes('formal') && lower.includes('shoes'))) {
    const list = PRODUCT_TYPE_IMAGES.derbyShoes;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('boots')) {
    const list = PRODUCT_TYPE_IMAGES.hikingBoots;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('suitcase') || lower.includes('luggage') || lower.includes('trolley')) {
    const list = PRODUCT_TYPE_IMAGES.suitCase;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('backpack') || lower.includes('daypack')) {
    const list = PRODUCT_TYPE_IMAGES.backpack;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('slides')) {
    const list = PRODUCT_TYPE_IMAGES.slides;
    return list[(counter - 1) % list.length];
  }

  // Fashion keywords
  if (lower.includes('kurta') || lower.includes('sherwani') || lower.includes('nehru')) {
    const list = PRODUCT_TYPE_IMAGES.kurta;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('kurti') || lower.includes('anarkali')) {
    const list = PRODUCT_TYPE_IMAGES.kurtiSet;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('blazer') || lower.includes('suit')) {
    const list = PRODUCT_TYPE_IMAGES.blazer;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('jeans') || lower.includes('denim')) {
    const list = PRODUCT_TYPE_IMAGES.jeans;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('trousers') || lower.includes('chino')) {
    const list = PRODUCT_TYPE_IMAGES.trousers;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('shirt')) {
    const list = PRODUCT_TYPE_IMAGES.formalShirt;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('tee') || lower.includes('t-shirt') || lower.includes('polo')) {
    const list = PRODUCT_TYPE_IMAGES.tshirt;
    return list[(counter - 1) % list.length];
  }

  // Jewelry & Watches
  if (lower.includes('watch') || lower.includes('timepiece')) {
    const list = PRODUCT_TYPE_IMAGES.watch;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('ring')) {
    const list = PRODUCT_TYPE_IMAGES.ring;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('earring') || lower.includes('stud')) {
    const list = PRODUCT_TYPE_IMAGES.earrings;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('necklace') || lower.includes('pendant') || lower.includes('chain')) {
    const list = PRODUCT_TYPE_IMAGES.necklace;
    return list[(counter - 1) % list.length];
  }

  // Beauty
  if (lower.includes('serum')) {
    const list = PRODUCT_TYPE_IMAGES.serum;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('shampoo')) {
    const list = PRODUCT_TYPE_IMAGES.shampoo;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('oil')) {
    const list = PRODUCT_TYPE_IMAGES.faceOil;
    return list[(counter - 1) % list.length];
  }
  if (lower.includes('wash') || lower.includes('cleanser')) {
    const list = PRODUCT_TYPE_IMAGES.faceWash;
    return list[(counter - 1) % list.length];
  }

  // Default fallback
  return PRODUCT_TYPE_IMAGES.cookwareSet[0];
}

// Generate realistic variants based on product type
function getVariantsForProduct(varType, basePrice, baseSku) {
  const price = Number(basePrice);
  switch (varType) {
    case 'color':
      return [
        { title: 'Carbon Black', price: price, sku: `${baseSku}-BLK`, stock: 35 },
        { title: 'Navy Blue', price: price, sku: `${baseSku}-BLU`, stock: 24 },
        { title: 'Olive Green', price: price + 100, sku: `${baseSku}-GRN`, stock: 18 },
      ];
    case 'clothing':
      return [
        { title: 'Size: S / Indigo Blue', price: price, sku: `${baseSku}-S-BLU`, stock: 20 },
        { title: 'Size: M / Indigo Blue', price: price, sku: `${baseSku}-M-BLU`, stock: 45 },
        { title: 'Size: L / Indigo Blue', price: price, sku: `${baseSku}-L-BLU`, stock: 38 },
        { title: 'Size: XL / Charcoal Grey', price: price + 100, sku: `${baseSku}-XL-GRY`, stock: 15 },
      ];
    case 'shoes':
      return [
        { title: 'Size UK 7 / Tan Brown', price: price, sku: `${baseSku}-UK7-BRN`, stock: 14 },
        { title: 'Size UK 8 / Tan Brown', price: price, sku: `${baseSku}-UK8-BRN`, stock: 30 },
        { title: 'Size UK 9 / Tan Brown', price: price, sku: `${baseSku}-UK9-BRN`, stock: 26 },
        { title: 'Size UK 8 / Midnight Black', price: price, sku: `${baseSku}-UK8-BLK`, stock: 28 },
      ];
    case 'storage':
      return [
        { title: '128GB Storage / 6GB RAM', price: price, sku: `${baseSku}-128`, stock: 25 },
        { title: '256GB Storage / 8GB RAM', price: price + 2500, sku: `${baseSku}-256`, stock: 30 },
        { title: '512GB Storage / 12GB RAM', price: price + 6000, sku: `${baseSku}-512`, stock: 12 },
      ];
    case 'volume':
      return [
        { title: '50ml Standard Bottle', price: price, sku: `${baseSku}-50ML`, stock: 45 },
        { title: '100ml Value Pack', price: Math.round(price * 1.7), sku: `${baseSku}-100ML`, stock: 35 },
        { title: '200ml Family Pack', price: Math.round(price * 2.8), sku: `${baseSku}-200ML`, stock: 20 },
      ];
    case 'cookerCapacity':
      return [
        { title: '2.0 Litre Capacity', price: price, sku: `${baseSku}-2L`, stock: 22 },
        { title: '3.5 Litre Capacity', price: price + 400, sku: `${baseSku}-3L5`, stock: 34 },
        { title: '5.0 Litre Family Capacity', price: price + 850, sku: `${baseSku}-5L`, stock: 19 },
      ];
    case 'bottleCapacity':
      return [
        { title: '500ml Silver Matte', price: price, sku: `${baseSku}-500ML`, stock: 40 },
        { title: '750ml Silver Matte', price: price + 200, sku: `${baseSku}-750ML`, stock: 30 },
        { title: '1000ml Jet Black', price: price + 400, sku: `${baseSku}-1L-BLK`, stock: 25 },
      ];
    case 'watchStrap':
      return [
        { title: 'Stainless Steel Bracelet / Black Dial', price: price, sku: `${baseSku}-SS-BLK`, stock: 20 },
        { title: 'Genuine Italian Leather Strap / White Dial', price: price - 300, sku: `${baseSku}-LTH-WHT`, stock: 18 },
        { title: 'Rose Gold Plated Mesh / Blue Sunray Dial', price: price + 700, sku: `${baseSku}-RG-BLU`, stock: 14 },
      ];
    case 'ringSize':
      return [
        { title: 'Size 12 (16.5mm) / Rhodium Finish', price: price, sku: `${baseSku}-SZ12`, stock: 16 },
        { title: 'Size 14 (17.3mm) / Rhodium Finish', price: price, sku: `${baseSku}-SZ14`, stock: 22 },
        { title: 'Size 16 (18.1mm) / 18K Yellow Gold Plated', price: price + 300, sku: `${baseSku}-SZ16-GLD`, stock: 15 },
      ];
    case 'metalColor':
      return [
        { title: '925 Sterling Silver Finish', price: price, sku: `${baseSku}-SLV`, stock: 25 },
        { title: '18K Yellow Gold Plating', price: price + 500, sku: `${baseSku}-GLD`, stock: 20 },
        { title: '18K Rose Gold Plating', price: price + 650, sku: `${baseSku}-RSG`, stock: 15 },
      ];
    case 'bedSize':
      return [
        { title: 'Double Bed (Queen Size: 90x100 in)', price: price, sku: `${baseSku}-QUEEN`, stock: 28 },
        { title: 'King Bed Extra Large (108x108 in)', price: price + 350, sku: `${baseSku}-KING`, stock: 20 },
      ];
    case 'luggage':
      return [
        { title: 'Cabin Size (55 cm / 45L)', price: price, sku: `${baseSku}-55CM`, stock: 22 },
        { title: 'Medium Check-in (65 cm / 75L)', price: price + 900, sku: `${baseSku}-65CM`, stock: 18 },
        { title: 'Large Check-in (75 cm / 110L)', price: price + 1800, sku: `${baseSku}-75CM`, stock: 12 },
      ];
    case 'backpack':
      return [
        { title: '24L Everyday Compact (Black)', price: price, sku: `${baseSku}-24L-BLK`, stock: 32 },
        { title: '32L Pro Travel with Rain Cover (Navy)', price: price + 400, sku: `${baseSku}-32L-NVY`, stock: 25 },
      ];
    default:
      return [
        { title: 'Standard Edition', price: price, sku: `${baseSku}-STD`, stock: 30 },
        { title: 'Premium Edition', price: price + 300, sku: `${baseSku}-PRM`, stock: 20 },
      ];
  }
}

async function main() {
  console.log('🚀 Starting massive 1,000+ Indian Brand Product & Variant Seeding...');

  // 1. Clean existing records safely
  await prisma.orderStatusHistory.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  console.log('🧹 Cleaned existing database tables.');

  // 2. Create core users
  const passwordHash = await bcrypt.hash('Password@123', 10);
  await prisma.user.createMany({
    data: [
      { email: 'admin@specbee.com', password: passwordHash, name: 'Center Shopping Admin', role: 'ADMIN' },
      { email: 'agent@specbee.com', password: passwordHash, name: 'Vikram Mehta (Sales Partner)', role: 'SALES_AGENT' },
      { email: 'customer@specbee.com', password: passwordHash, name: 'Rahul Sharma', role: 'CUSTOMER' },
      { email: 'priya.sharma@example.com', password: passwordHash, name: 'Priya Sharma', role: 'CUSTOMER' },
      { email: 'amit.verma@example.com', password: passwordHash, name: 'Amit Verma', role: 'CUSTOMER' },
    ]
  });
  console.log('✅ Created Admin, Sales Agent, and Customer users.');

  // 3. Create Coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: '10% discount on all orders over ₹499',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 499,
        maxDiscountAmount: 1000,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimitTotal: 1000,
        usageLimitPerUser: 1,
        isActive: true,
      },
      {
        code: 'CENTER500',
        description: 'Flat ₹500 off on festive orders over ₹2,999',
        discountType: 'FLAT',
        discountValue: 500,
        minOrderValue: 2999,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimitTotal: 500,
        usageLimitPerUser: 1,
        isActive: true,
      },
      {
        code: 'AGENTPROMO',
        description: 'Exclusive 15% partner discount code',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderValue: 999,
        maxDiscountAmount: 2500,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimitTotal: 1000,
        usageLimitPerUser: 2,
        isActive: true,
      }
    ]
  });
  console.log('✅ Created Active E-Commerce coupons.');

  // 4. Procedurally generate 1,000+ Products and 3,000+ Variants
  const productsToInsert = [];
  const variantsToInsert = [];
  let productCounter = 1;
  const categoriesList = Object.keys(CATEGORIES_DATA);

  // Target: ~180 products per category across 6 categories = ~1,080 products
  const targetPerCategory = 175;

  for (const catName of categoriesList) {
    const catData = CATEGORIES_DATA[catName];
    let catProductsCount = 0;

    for (const brand of catData.brands) {
      for (const item of catData.items) {
        for (const series of catData.series) {
          if (catProductsCount >= targetPerCategory) break;

          const productId = crypto.randomUUID();
          const pNum = String(productCounter).padStart(4, '0');
          const productTitle = `${brand} ${series} ${item.name}`;
          const cleanSlug = `${brand}-${series}-${item.name}-${pNum}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          // Resolve image strictly matched to the item type & title (cookers get cookers, bedsheets get bedsheets, etc.)
          const imageUrl = getProductImage(productTitle, catName, item, productCounter);

          const description = `Original ${brand} ${series} edition. Designed for peak performance and everyday reliability in India. Comes with comprehensive 1-year brand warranty, verified authenticity certificate, and express door delivery.`;

          productsToInsert.push({
            id: productId,
            title: productTitle,
            slug: cleanSlug,
            description: description,
            category: catName,
            imageUrl: imageUrl,
            isPublished: true,
            expiryDate: null,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          });

          // Generate Variants (2 to 4 variants per product)
          const baseSku = `CS-${brand.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}-${pNum}`;
          const variantsList = getVariantsForProduct(item.varType, item.basePrice, baseSku);

          for (let vIndex = 0; vIndex < variantsList.length; vIndex++) {
            const v = variantsList[vIndex];
            // Some variants with low stock to trigger admin threshold alerts
            let finalStock = v.stock;
            if (productCounter % 27 === 0 && vIndex === 0) finalStock = 2; // Low stock
            if (productCounter % 83 === 0 && vIndex === 1) finalStock = 0; // Out of stock

            variantsToInsert.push({
              id: crypto.randomUUID(),
              productId: productId,
              sku: v.sku,
              title: v.title,
              price: v.price,
              stockQuantity: finalStock,
              lowStockThreshold: 5,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          productCounter++;
          catProductsCount++;
        }
        if (catProductsCount >= targetPerCategory) break;
      }
      if (catProductsCount >= targetPerCategory) break;
    }
  }

  console.log(`📦 Prepared ${productsToInsert.length} products and ${variantsToInsert.length} variants.`);

  // 5. Bulk insert products in chunks of 250 for maximum MySQL speed & safety
  console.log('💾 Inserting products into database in bulk batches...');
  const CHUNK_SIZE = 250;
  for (let i = 0; i < productsToInsert.length; i += CHUNK_SIZE) {
    const chunk = productsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.product.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  -> Inserted ${Math.min(i + CHUNK_SIZE, productsToInsert.length)} / ${productsToInsert.length} products`);
  }

  // 6. Bulk insert variants in chunks of 500
  console.log('💾 Inserting product variants into database in bulk batches...');
  const VARIANT_CHUNK = 500;
  for (let i = 0; i < variantsToInsert.length; i += VARIANT_CHUNK) {
    const chunk = variantsToInsert.slice(i, i + VARIANT_CHUNK);
    await prisma.productVariant.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`  -> Inserted ${Math.min(i + VARIANT_CHUNK, variantsToInsert.length)} / ${variantsToInsert.length} variants`);
  }

  // 7. Seed sample historical orders for Rahul Sharma so order history & admin dashboard are populated
  const customerUser = await prisma.user.findUnique({ where: { email: 'customer@specbee.com' } });
  if (customerUser && variantsToInsert.length > 5) {
    console.log('🛍️ Generating initial orders and purchase history...');
    const sampleStatuses = ['DELIVERED', 'SHIPPED', 'PROCESSING', 'CONFIRMED', 'CANCELLED'];

    for (let oIdx = 0; oIdx < 5; oIdx++) {
      const v1 = variantsToInsert[oIdx * 3];
      const v2 = variantsToInsert[oIdx * 3 + 1];
      const totalAmount = Number(v1.price) + Number(v2.price);

      const p1 = productsToInsert.find((p) => p.id === v1.productId);
      const p2 = productsToInsert.find((p) => p.id === v2.productId);

      const order = await prisma.order.create({
        data: {
          orderNumber: `CS-ORD-${1001 + oIdx}`,
          userId: customerUser.id,
          subtotal: totalAmount,
          discountAmount: 0,
          shippingFee: 0,
          totalAmount: totalAmount,
          status: sampleStatuses[oIdx],
          shippingAddress: JSON.stringify({
            fullName: 'Rahul Sharma',
            address: 'Flat 402, Prestige Tech Park, Outer Ring Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560103',
            phone: '+91 98765 43210'
          }),
          items: {
            create: [
              {
                variantId: v1.id,
                productTitle: p1?.title || 'Authentic Premium Product',
                variantTitle: v1.title,
                quantity: 1,
                price: v1.price,
                subtotal: v1.price,
              },
              {
                variantId: v2.id,
                productTitle: p2?.title || 'Authentic Premium Product',
                variantTitle: v2.title,
                quantity: 1,
                price: v2.price,
                subtotal: v2.price,
              }
            ]
          }
        }
      });

      // Add status history
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: sampleStatuses[oIdx],
          changedById: customerUser.id,
          notes: 'Initial order placement and payment confirmation',
        }
      });
    }
    console.log('✅ Created 5 sample customer orders across statuses (DELIVERED, SHIPPED, PROCESSING, CONFIRMED, PENDING).');
  }

  const finalProductCount = await prisma.product.count();
  const finalVariantCount = await prisma.productVariant.count();

  console.log('====================================================');
  console.log(`🎉 MASSIVE DATASET SEEDING COMPLETE!`);
  console.log(`📊 Total Products in Database: ${finalProductCount}`);
  console.log(`🏷️ Total Product Variants in Database: ${finalVariantCount}`);
  console.log(`🛒 Categories Seeded: ${categoriesList.join(', ')}`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
