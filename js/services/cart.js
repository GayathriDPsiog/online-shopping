// ============================================================
// cart.js — the shopping cart, kept in localStorage so it
// survives page refreshes and costs no database writes.
// Each line: { productId, title, price (paise), qty }
// ============================================================
const Cart = (function () {
  const KEY = 'shop_cart';

  function items() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    if (typeof Ui !== 'undefined') Ui.updateCartCount();
  }
  function qtyOf(productId) {
    const line = items().find(function (i) { return i.productId === productId; });
    return line ? line.qty : 0;
  }

  // Add one unit (or more). Never more than the available stock.
  function add(product, qty) {
    qty = qty || 1;
    const list = items();
    const line = list.find(function (i) { return i.productId === product.id; });
    const newQty = (line ? line.qty : 0) + qty;
    if (newQty > product.qty) return { ok: false, msg: 'Only ' + product.qty + ' in stock.' };
    if (line) line.qty = newQty;
    else list.push({ productId: product.id, title: product.title, price: product.price, qty: qty });
    save(list);
    return { ok: true };
  }

  // Set an exact quantity. 0 (or less) removes the line. Capped at maxStock.
  function setQty(productId, qty, maxStock) {
    const list = items();
    const idx = list.findIndex(function (i) { return i.productId === productId; });
    if (idx === -1) return { ok: false };
    if (qty <= 0) {
      const removed = list.splice(idx, 1)[0];
      save(list);
      return { ok: true, removed: removed, index: idx };
    }
    if (maxStock !== undefined && qty > maxStock) return { ok: false, msg: 'Only ' + maxStock + ' in stock.' };
    list[idx].qty = qty;
    save(list);
    return { ok: true };
  }

  function remove(productId) {
    return setQty(productId, 0);
  }

  // Put a removed line back (Undo)
  function restore(line, index) {
    const list = items();
    if (list.some(function (i) { return i.productId === line.productId; })) return;
    list.splice(Math.min(index, list.length), 0, line);
    save(list);
  }

  // Keep stored title/price in sync with the latest product data
  function refreshLine(productId, title, price) {
    const list = items();
    const line = list.find(function (i) { return i.productId === productId; });
    if (line) { line.title = title; line.price = price; save(list); }
  }

  function clear() { save([]); }
  function count() { return items().reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return items().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }

  return { items: items, qtyOf: qtyOf, add: add, setQty: setQty, remove: remove, restore: restore,
    refreshLine: refreshLine, clear: clear, count: count, subtotal: subtotal };
})();
