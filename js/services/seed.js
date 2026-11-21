// ============================================================
// seed.js — "Load sample data" for the admin dashboard.
//
// Adds 10 categories and 184 products with REAL product photos.
// Product names, prices and photos come from DummyJSON
// (dummyjson.com — a free demo-store API). Only the image URLs
// are stored in Firestore; the browser loads the photos from
// cdn.dummyjson.com. Most products have 3–4 photos.
//
// Safe to run more than once:
//  • categories with the same name are reused
//  • products with the same title in the same category are skipped
//  • old sample products from the first version (loremflickr images)
//    are removed — or deactivated if they already appear in an order
//  • categories left empty by that clean-up are deactivated
// ============================================================
const Seed = {

  IMG_BASE: 'https://cdn.dummyjson.com/product-images/',
  USD_TO_INR: 85,                                     // rough conversion for demo prices
  QTY: [45, 8, 120, 30, 0, 75, 12, 200, 25, 60],      // gives high (>100), low (<15) and out-of-stock items

  // Each group: target category, DummyJSON image folder, description, items.
  // Item: [title, price in USD, number of photos, (optional) image folder name if different from title]
  groups: [
    { cat: 'Smartphones', src: 'smartphones', desc: 'Smartphone with a sharp display, dependable battery life and a capable camera for everyday use.', items: [
      ['iPhone 5s', 199.99, 3], ['iPhone 6', 299.99, 3], ['iPhone 13 Pro', 1099.99, 3], ['iPhone X', 899.99, 3],
      ['Oppo A57', 249.99, 3], ['Oppo F19 Pro Plus', 399.99, 3], ['Oppo K1', 299.99, 4], ['Realme C35', 149.99, 3],
      ['Realme X', 299.99, 3], ['Realme XT', 349.99, 3], ['Samsung Galaxy S7', 299.99, 3], ['Samsung Galaxy S8', 499.99, 3],
      ['Samsung Galaxy S10', 699.99, 3], ['Vivo S1', 249.99, 3], ['Vivo V9', 299.99, 3], ['Vivo X21', 499.99, 3]] },

    { cat: 'Electronics', src: 'laptops', desc: 'Powerful laptop with a high-resolution display, fast storage and all-day productivity.', items: [
      ['Apple MacBook Pro 14 Inch Space Grey', 1999.99, 3], ['Asus Zenbook Pro Dual Screen Laptop', 1799.99, 3],
      ['Huawei Matebook X Pro', 1399.99, 3], ['Lenovo Yoga 920', 1099.99, 3], ['New DELL XPS 13 9300 Laptop', 1499.99, 3]] },
    { cat: 'Electronics', src: 'tablets', desc: 'Lightweight tablet for reading, streaming, notes and video calls.', items: [
      ['iPad Mini 2021 Starlight', 499.99, 4], ['Samsung Galaxy Tab S8 Plus Grey', 599.99, 4], ['Samsung Galaxy Tab White', 349.99, 4]] },
    { cat: 'Electronics', src: 'mobile-accessories', desc: 'Useful accessory that makes your phone and gadgets more convenient to use.', items: [
      ['Amazon Echo Plus', 99.99, 2], ['Apple Airpods', 129.99, 3], ['Apple AirPods Max Silver', 549.99, 1],
      ['Apple Airpower Wireless Charger', 79.99, 1], ['Apple HomePod Mini Cosmic Grey', 99.99, 1], ['Apple iPhone Charger', 19.99, 2],
      ['Apple MagSafe Battery Pack', 99.99, 2], ['Apple Watch Series 4 Gold', 349.99, 3], ['Beats Flex Wireless Earphones', 49.99, 1],
      ['iPhone 12 Silicone Case with MagSafe Plum', 29.99, 4], ['Monopod', 19.99, 2], ['Selfie Lamp with iPhone', 14.99, 1],
      ['Selfie Stick Monopod', 12.99, 1], ['TV Studio Camera Pedestal', 499.99, 1]] },

    { cat: 'Clothing', src: 'mens-shirts', desc: "Men's shirt in breathable fabric with a comfortable, smart fit.", items: [
      ['Blue & Black Check Shirt', 29.99, 4], ['Gigabyte Aorus Men Tshirt', 24.99, 4], ['Man Plaid Shirt', 34.99, 4],
      ['Man Short Sleeve Shirt', 19.99, 4], ['Men Check Shirt', 27.99, 4]] },
    { cat: 'Clothing', src: 'tops', desc: 'Light and comfortable dress, easy to style for daytime or casual outings.', items: [
      ['Blue Frock', 29.99, 4], ['Girl Summer Dress', 19.99, 4], ['Gray Dress', 34.99, 4], ['Short Frock', 24.99, 4], ['Tartan Dress', 39.99, 4]] },
    { cat: 'Clothing', src: 'womens-dresses', desc: "Elegant women's outfit for parties, events and special occasions.", items: [
      ["Black Women's Gown", 129.99, 4], ['Corset Leather With Skirt', 89.99, 4], ['Corset With Black Skirt', 79.99, 4],
      ['Dress Pea', 49.99, 4], ['Marni Red & Black Suit', 179.99, 4]] },

    { cat: 'Footwear', src: 'mens-shoes', desc: "Men's footwear with a cushioned sole and durable build.", items: [
      ['Nike Air Jordan 1 Red And Black', 149.99, 4], ['Nike Baseball Cleats', 79.99, 4], ['Puma Future Rider Trainers', 89.99, 4],
      ['Sports Sneakers Off White & Red', 119.99, 4], ['Sports Sneakers Off White Red', 109.99, 4]] },
    { cat: 'Footwear', src: 'womens-shoes', desc: "Women's footwear that combines comfort with style.", items: [
      ['Black & Brown Slipper', 19.99, 4], ['Calvin Klein Heel Shoes', 79.99, 4], ['Golden Shoes Woman', 49.99, 4],
      ['Pampi Shoes', 29.99, 4], ['Red Shoes', 34.99, 4]] },

    { cat: 'Watches & Jewellery', src: 'mens-watches', desc: "Men's wrist watch with precise movement and a classic design.", items: [
      ['Brown Leather Belt Watch', 89.99, 3], ['Longines Master Collection', 1499.99, 3], ['Rolex Cellini Date Black Dial', 8999.99, 3],
      ['Rolex Cellini Moonphase', 12999.99, 3], ['Rolex Datejust', 10999.99, 3], ['Rolex Submariner Watch', 13999.99, 3]] },
    { cat: 'Watches & Jewellery', src: 'womens-watches', desc: "Women's watch with an elegant dial, made to be worn every day.", items: [
      ['IWC Ingenieur Automatic Steel', 4999.99, 3], ['Rolex Cellini Moonphase Women', 15999.99, 3, 'rolex-cellini-moonphase'],
      ['Rolex Datejust Women', 10999.99, 3], ['Watch Gold for Women', 799.99, 3], ["Women's Wrist Watch", 129.99, 3]] },
    { cat: 'Watches & Jewellery', src: 'womens-jewellery', desc: 'Lightweight earrings that add a touch of colour to any outfit.', items: [
      ['Green Crystal Earring', 29.99, 3], ['Green Oval Earring', 24.99, 3], ['Tropical Earring', 19.99, 3]] },

    { cat: 'Bags & Eyewear', src: 'womens-bags', desc: 'Spacious, well-stitched bag for work, travel and daily use.', items: [
      ["Blue Women's Handbag", 49.99, 3], ["Heshe Women's Leather Bag", 129.99, 3], ['Prada Women Bag', 599.99, 3],
      ['White Faux Leather Backpack', 39.99, 3], ['Women Handbag Black', 59.99, 3]] },
    { cat: 'Bags & Eyewear', src: 'sunglasses', desc: 'Sunglasses with UV-protected lenses and a comfortable frame.', items: [
      ['Black Sun Glasses', 29.99, 3], ['Classic Sun Glasses', 24.99, 3], ['Green and Black Glasses', 34.99, 3],
      ['Party Glasses', 19.99, 3], ['Sunglasses', 22.99, 3]] },

    { cat: 'Beauty & Personal Care', src: 'beauty', desc: 'Long-lasting make-up essential for a polished everyday look.', items: [
      ['Essence Mascara Lash Princess', 9.99, 1], ['Eyeshadow Palette with Mirror', 19.99, 1], ['Powder Canister', 14.99, 1],
      ['Red Lipstick', 12.99, 1], ['Red Nail Polish', 8.99, 1]] },
    { cat: 'Beauty & Personal Care', src: 'fragrances', desc: 'Signature fragrance with a long-lasting, memorable scent.', items: [
      ['Calvin Klein CK One', 49.99, 3], ['Chanel Coco Noir Eau De', 129.99, 3], ["Dior J'adore", 89.99, 3],
      ['Dolce Shine Eau de', 69.99, 3], ['Gucci Bloom Eau de', 79.99, 3]] },
    { cat: 'Beauty & Personal Care', src: 'skin-care', desc: 'Gentle skin-care product that cleans and keeps skin moisturised.', items: [
      ['Attitude Super Leaves Hand Soap', 8.99, 3], ['Olay Ultra Moisture Shea Butter Body Wash', 12.99, 3], ['Vaseline Men Body and Face Lotion', 9.99, 3]] },

    { cat: 'Home & Kitchen', src: 'kitchen-accessories', desc: 'Practical kitchen essential that makes cooking and serving easier.', items: [
      ['Bamboo Spatula', 7.99, 1], ['Black Aluminium Cup', 5.99, 2], ['Black Whisk', 9.99, 1], ['Boxed Blender', 39.99, 4],
      ['Carbon Steel Wok', 29.99, 1], ['Chopping Board', 12.99, 1], ['Citrus Squeezer Yellow', 8.99, 1], ['Egg Slicer', 6.99, 1],
      ['Electric Stove', 49.99, 4], ['Fine Mesh Strainer', 9.99, 1], ['Fork', 3.99, 1], ['Glass', 4.99, 1],
      ['Grater Black', 10.99, 1], ['Hand Blender', 34.99, 1], ['Ice Cube Tray', 5.99, 1], ['Kitchen Sieve', 7.99, 1],
      ['Knife', 14.99, 1], ['Lunch Box', 12.99, 1], ['Microwave Oven', 89.99, 4], ['Mug Tree Stand', 15.99, 2],
      ['Pan', 24.99, 1], ['Plate', 3.99, 1], ['Red Tongs', 6.99, 1], ['Silver Pot With Glass Cap', 39.99, 1],
      ['Slotted Turner', 8.99, 1], ['Spice Rack', 19.99, 1], ['Spoon', 4.99, 1], ['Tray', 16.99, 1],
      ['Wooden Rolling Pin', 11.99, 1], ['Yellow Peeler', 5.99, 1]] },
    { cat: 'Home & Kitchen', src: 'home-decoration', desc: 'Decorative piece that brings warmth and style to any room.', items: [
      ['Decoration Swing', 59.99, 3], ['Family Tree Photo Frame', 29.99, 1], ['House Showpiece Plant', 39.99, 3],
      ['Plant Pot', 14.99, 4], ['Table Lamp', 49.99, 1]] },
    { cat: 'Home & Kitchen', src: 'furniture', desc: 'Well-crafted furniture made from quality materials for lasting comfort.', items: [
      ['Annibale Colombo Bed', 1899.99, 3], ['Annibale Colombo Sofa', 2499.99, 3], ['Bedside Table African Cherry', 299.99, 3],
      ['Knoll Saarinen Executive Conference Chair', 499.99, 3], ['Wooden Bathroom Sink With Mirror', 799.99, 3]] },

    { cat: 'Groceries', src: 'groceries', desc: 'Fresh, quality-checked grocery item for your daily needs.', items: [
      ['Apple', 1.99, 1], ['Beef Steak', 12.99, 1], ['Cat Food', 8.99, 1], ['Chicken Meat', 9.99, 2], ['Cooking Oil', 4.99, 1],
      ['Cucumber', 1.49, 1], ['Dog Food', 10.99, 1], ['Eggs', 2.99, 1], ['Fish Steak', 14.99, 1], ['Green Bell Pepper', 1.29, 1],
      ['Green Chili Pepper', 0.99, 1], ['Honey Jar', 6.99, 1], ['Ice Cream', 5.49, 4], ['Juice', 3.99, 1], ['Kiwi', 2.49, 1],
      ['Lemon', 0.79, 1], ['Milk', 3.49, 1], ['Mulberry', 4.99, 1], ['Nescafe Coffee', 7.99, 1], ['Potatoes', 2.29, 1],
      ['Protein Powder', 19.99, 1], ['Red Onions', 1.99, 1], ['Rice', 5.99, 1], ['Soft Drinks', 1.99, 1], ['Strawberry', 3.99, 1],
      ['Tissue Paper Box', 2.49, 2], ['Water', 0.99, 1]] },

    { cat: 'Sports & Fitness', src: 'sports-accessories', desc: 'Sports gear built for practice, matches and everyday play.', items: [
      ['American Football', 19.99, 1], ['Baseball Ball', 8.99, 1], ['Baseball Glove', 24.99, 3], ['Basketball', 14.99, 1],
      ['Basketball Rim', 39.99, 1], ['Cricket Ball', 12.99, 1], ['Cricket Bat', 29.99, 1], ['Cricket Helmet', 44.99, 4],
      ['Cricket Wicket', 29.99, 1], ['Feather Shuttlecock', 5.99, 1], ['Football', 17.99, 1], ['Golf Ball', 9.99, 1],
      ['Iron Golf', 49.99, 1], ['Metal Baseball Bat', 29.99, 1], ['Tennis Ball', 6.99, 1], ['Tennis Racket', 49.99, 1],
      ['Volleyball', 11.99, 1]] }
  ],

  // Image folder = title in lowercase with spaces → dashes (DummyJSON's naming)
  imageUrls(group, item) {
    const folder = item[3] || item[0].toLowerCase().replace(/ /g, '-');
    const urls = [];
    for (let i = 1; i <= item[2]; i++) urls.push(Seed.IMG_BASE + group.src + '/' + folder + '/' + i + '.webp');
    return urls;
  },

  // USD → INR, rounded to a "…9" price, in paise
  pricePaise(usd) {
    const rupees = Math.max(9, Math.round(usd * Seed.USD_TO_INR / 10) * 10 - 1);
    return rupees * 100;
  },

  // Firestore-style random document ID (20 characters)
  newId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  },

  createWrite(collection, id, data) {
    return { update: { name: Api.docName(collection, id), fields: Api.toFields(data) }, currentDocument: { exists: false } };
  },
  updateWrite(collection, id, data) {
    return { update: { name: Api.docName(collection, id), fields: Api.toFields(data) }, updateMask: { fieldPaths: Object.keys(data) }, currentDocument: { exists: true } };
  },
  deleteWrite(collection, id) {
    return { delete: Api.docName(collection, id) };
  },

  isOldSample(p) {
    return /loremflickr\.com/.test(p.imageUrl || '');
  },

  async run() {
    const res = await Promise.all([Catalog.getCategories(), Catalog.getProducts(), Orders.all()]);
    const cats = res[0], products = res[1], orders = res[2];
    const writes = [];
    const now = new Date();
    const result = { categories: 0, products: 0, removed: 0, deactivated: 0 };

    // 1. Clean up the first version's sample products (their images don't load)
    const soldIds = {};
    orders.forEach(function (o) { (o.productIds || []).forEach(function (pid) { soldIds[pid] = true; }); });
    const remaining = {};   // catId → number of products that will remain
    products.forEach(function (p) {
      if (Seed.isOldSample(p)) {
        if (soldIds[p.id]) {          // keep for old bills/reports, but hide from the shop
          if (p.active !== false) { writes.push(Seed.updateWrite('products', p.id, { active: false, updatedAt: now })); result.deactivated++; }
          return;                     // hidden, so it doesn't keep its category "in use"
        } else {
          writes.push(Seed.deleteWrite('products', p.id));
          result.removed++;
          return;
        }
      }
      remaining[p.catId] = (remaining[p.catId] || 0) + 1;
    });

    // 2. Categories: reuse by name, create missing ones
    const catIdByName = {};
    cats.forEach(function (c) { catIdByName[(c.nameLower || c.name || '').toLowerCase()] = c.id; });
    const targetNames = {};
    Seed.groups.forEach(function (g) {
      const key = g.cat.toLowerCase();
      targetNames[key] = true;
      if (!catIdByName[key]) {
        catIdByName[key] = Seed.newId();
        writes.push(Seed.createWrite('categories', catIdByName[key], { name: g.cat, nameLower: key, active: true, createdAt: now }));
        result.categories++;
      } else {
        const existing = cats.find(function (c) { return c.id === catIdByName[key]; });
        if (existing && existing.active === false) writes.push(Seed.updateWrite('categories', existing.id, { active: true }));
      }
    });

    // 3. Old categories that are now empty and not part of the new set → deactivate
    cats.forEach(function (c) {
      const key = (c.nameLower || c.name || '').toLowerCase();
      if (!targetNames[key] && !remaining[c.id] && c.active !== false) writes.push(Seed.updateWrite('categories', c.id, { active: false }));
    });

    // 4. Products (skip any that already exist with the same title in the same category)
    const existing = {};
    products.forEach(function (p) { if (!Seed.isOldSample(p)) existing[p.catId + '|' + (p.titleLower || '')] = true; });
    let index = 0;
    Seed.groups.forEach(function (g) {
      const catId = catIdByName[g.cat.toLowerCase()];
      g.items.forEach(function (item) {
        index++;
        const title = item[0];
        if (existing[catId + '|' + title.toLowerCase()]) return;
        existing[catId + '|' + title.toLowerCase()] = true;
        writes.push(Seed.createWrite('products', Seed.newId(), {
          catId: catId,
          title: title,
          titleLower: title.toLowerCase(),
          desc: g.desc,
          price: Seed.pricePaise(item[1]),
          qty: Seed.QTY[index % Seed.QTY.length],
          images: Seed.imageUrls(g, item),          // list of image URLs — the photos themselves are not stored
          active: true,
          createdAt: new Date(now.getTime() - index * 60000),
          updatedAt: now
        }));
        result.products++;
      });
    });

    // Firestore allows up to 500 writes per commit; send in chunks of 400
    for (let i = 0; i < writes.length; i += 400) {
      await Api.commit(writes.slice(i, i + 400));
    }
    return result;
  }
};
