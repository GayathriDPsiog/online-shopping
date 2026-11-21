// ============================================================
// orders.js — placing orders (the most important logic) and
// reading order history / bills.
//
// placeOrder() is ATOMIC: stock decrease, credit update and the
// new order are sent in ONE Firestore "commit". Each product and
// the customer carry a precondition "only if unchanged since I
// read it" (updateTime). If someone else bought the same item in
// between, Firestore rejects everything and we retry with fresh
// data — so stock can never go negative and nothing half-saves.
// ============================================================
const Orders = {

  newOrderId() {
    return 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  },

  async placeOrder(payMode) {
    const user = Auth.user();
    if (!user) throw new Error('Please sign in to place an order.');
    if (Auth.isAdmin()) throw new Error('The admin account cannot place orders.');
    const cart = Cart.items();
    if (!cart.length) throw new Error('Your cart is empty.');
    if (payMode !== 'cash' && payMode !== 'credit') throw new Error('Choose a payment method.');

    for (let attempt = 1; attempt <= 3; attempt++) {
      // 1. READ fresh data (never trust prices stored in the browser)
      const products = await Promise.all(cart.map(function (line) { return Api.get('products', line.productId); }));
      const customer = await Api.get('customers', user.uid);
      if (!customer) throw new Error('Your customer profile is missing. Sign out and sign in again.');
      if (customer.active === false) throw new Error('Your account is blocked. Please contact the store.');

      // 2. VALIDATE and calculate using database prices
      const items = [];
      let total = 0, itemCount = 0;
      cart.forEach(function (line, i) {
        const p = products[i];
        if (!p || p.active === false) throw new Error('"' + line.title + '" is no longer available. Remove it from your cart.');
        if (line.qty > p.qty) throw new Error('Only ' + p.qty + ' left of "' + p.title + '". Please reduce the quantity.');
        const lineTotal = p.price * line.qty;
        total += lineTotal;
        itemCount += line.qty;
        items.push({ productId: p.id, title: p.title, catId: p.catId, price: p.price, qty: line.qty, lineTotal: lineTotal });
      });
      if (payMode === 'credit') {
        const available = Customers.available(customer);
        if (total > available) {
          throw new Error('Not enough credit. Available ' + Util.inr(available) + ', order total ' + Util.inr(total) + '. Pay by cash or remove items.');
        }
      }

      // 3. BUILD the atomic write list
      const writes = products.map(function (p, i) {
        return {
          update: { name: Api.docName('products', p.id), fields: Api.toFields({ qty: p.qty - cart[i].qty }) },
          updateMask: { fieldPaths: ['qty'] },
          currentDocument: { updateTime: p._updateTime }
        };
      });
      if (payMode === 'credit') {
        writes.push({
          update: { name: Api.docName('customers', user.uid), fields: Api.toFields({ creditUsed: (customer.creditUsed || 0) + total }) },
          updateMask: { fieldPaths: ['creditUsed'] },
          currentDocument: { updateTime: customer._updateTime }
        });
      }
      const orderId = Orders.newOrderId();
      const order = {
        customerId: user.uid, customerName: customer.name, customerEmail: customer.email,
        payMode: payMode, total: total, itemCount: itemCount, items: items,
        productIds: items.map(function (it) { return it.productId; })
      };
      writes.push({
        update: { name: Api.docName('orders', orderId), fields: Api.toFields(order) },
        updateTransforms: [{ fieldPath: 'date', setToServerValue: 'REQUEST_TIME' }],  // server clock, not the PC's
        currentDocument: { exists: false }
      });

      // 4. COMMIT — all or nothing
      try {
        await Api.commit(writes);
      } catch (e) {
        const conflict = e.code === 'FAILED_PRECONDITION' || e.code === 'ABORTED' || e.status === 409;
        if (conflict && attempt < 3) continue;  // someone changed the data: retry with fresh reads
        if (conflict) throw new Error('Stock changed while you were checking out. Please review your cart and try again.');
        throw e;
      }

      // 5. Success: clear cart, send email (a failed email never cancels the order)
      Cart.clear();
      order.id = orderId;
      order.date = new Date();
      Email.sendOrderEmail(order).catch(function (err) { console.warn('Order email failed:', err); });
      return order;
    }
  },

  get(id) {
    return Api.get('orders', id);
  },

  // Customer's own orders, newest first (sorted here to avoid needing a Firestore index)
  async mine() {
    const list = await Api.query('orders', [['customerId', '==', Auth.user().uid]]);
    return list.sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
  },

  async all() {
    const list = await Api.listAll('orders');
    return list.sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
  }
};
