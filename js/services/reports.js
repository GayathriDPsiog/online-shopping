// ============================================================
// reports.js — all report calculations. Firestore has no
// GROUP BY / SUM, so we fetch the data and aggregate here.
// ============================================================
const Reports = {

  async loadAll() {
    const r = await Promise.all([Orders.all(), Customers.list(), Catalog.getProducts(), Catalog.getCategories()]);
    return { orders: r[0], customers: r[1], products: r[2], categories: r[3] };
  },

  // Orders between two "YYYY-MM-DD" dates, inclusive of the whole "to" day
  inRange(orders, fromYmd, toYmd) {
    const from = Util.dayStart(fromYmd), to = Util.dayEnd(toYmd);
    return orders.filter(function (o) { return o.date && o.date >= from && o.date <= to; });
  },

  sum(list, field) {
    return list.reduce(function (s, x) { return s + (x[field] || 0); }, 0);
  },

  // ---------- Customer reports ----------
  topCustomers(orders, n) {
    const map = {};
    orders.forEach(function (o) {
      const c = map[o.customerId] || (map[o.customerId] = { customerId: o.customerId, name: o.customerName, email: o.customerEmail, orders: 0, total: 0, cash: 0, credit: 0 });
      c.orders += 1;
      c.total += o.total;
      c[o.payMode] += o.total;
    });
    return Object.values(map).sort(function (a, b) { return b.total - a.total; }).slice(0, n || 10);
  },

  byPayMode(orders, mode) {
    return orders.filter(function (o) { return o.payMode === mode; });
  },

  // ---------- Inventory reports ----------
  stock(products, catId) {
    return products.filter(function (p) { return !catId || p.catId === catId; });
  },
  highStock(products) {
    return products.filter(function (p) { return p.qty > CONFIG.HIGH_STOCK; }).sort(function (a, b) { return b.qty - a.qty; });
  },
  lowStock(products) {
    return products.filter(function (p) { return p.qty < CONFIG.LOW_STOCK; }).sort(function (a, b) { return a.qty - b.qty; });
  },

  // ---------- Sales reports ----------
  salesByCategory(orders, categories) {
    const names = {};
    categories.forEach(function (c) { names[c.id] = c.name; });
    const map = {};
    orders.forEach(function (o) {
      (o.items || []).forEach(function (it) {
        const row = map[it.catId] || (map[it.catId] = { catId: it.catId, name: names[it.catId] || '(deleted category)', units: 0, revenue: 0 });
        row.units += it.qty;
        row.revenue += it.lineTotal;
      });
    });
    return Object.values(map).sort(function (a, b) { return b.revenue - a.revenue; });
  },

  // Units sold per product. Includes products with ZERO sales (important for "bottom 10").
  itemSales(orders, products) {
    const map = {};
    products.forEach(function (p) { map[p.id] = { productId: p.id, title: p.title, catId: p.catId, units: 0, revenue: 0 }; });
    orders.forEach(function (o) {
      (o.items || []).forEach(function (it) {
        const row = map[it.productId] || (map[it.productId] = { productId: it.productId, title: it.title, catId: it.catId, units: 0, revenue: 0 });
        row.units += it.qty;
        row.revenue += it.lineTotal;
      });
    });
    return Object.values(map);
  },
  topItems(orders, products, n) {
    return Reports.itemSales(orders, products)
      .filter(function (r) { return r.units > 0; })
      .sort(function (a, b) { return b.units - a.units || b.revenue - a.revenue; })
      .slice(0, n || 10);
  },
  bottomItems(orders, products, n) {
    return Reports.itemSales(orders, products)
      .sort(function (a, b) { return a.units - b.units || a.revenue - b.revenue; })
      .slice(0, n || 10);
  }
};
