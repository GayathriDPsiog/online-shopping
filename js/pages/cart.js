// ============================================================
// cart.js (page) — cart lines with +/− (0 removes, with Undo),
// live totals, stale price/stock checks, cash/credit payment
// with credit check, and placing the order.
// ============================================================
$(async function () {
  if (Auth.isAdmin()) { location.href = 'admin/index.html'; return; }
  Ui.renderHeader();

  const fresh = {};          // productId → latest product from the database (or null)
  let customer = null;
  let payMode = 'cash';

  // ---------- 1. Load fresh data and reconcile the stored cart ----------
  $('#cartLines').html(Ui.skeleton(3, 'row-sk'));
  try {
    const lines = Cart.items();
    const prods = await Promise.all(lines.map(function (l) { return Catalog.getProduct(l.productId); }));
    const notes = [];
    lines.forEach(function (l, i) {
      const p = prods[i];
      fresh[l.productId] = p;
      if (!p || p.active === false) { notes.push('"' + l.title + '" is no longer available.'); return; }
      if (p.price !== l.price) notes.push('Price of "' + p.title + '" changed from ' + Util.inr(l.price) + ' to ' + Util.inr(p.price) + '.');
      if (p.price !== l.price || p.title !== l.title) Cart.refreshLine(p.id, p.title, p.price);
      if (p.qty <= 0) notes.push('"' + p.title + '" is now out of stock.');
      else if (l.qty > p.qty) { Cart.setQty(p.id, p.qty); notes.push('Only ' + p.qty + ' of "' + p.title + '" left, so the quantity was reduced.'); }
    });
    if (notes.length) {
      $('#notices').html('<div class="notice notice-warn"><strong>Your cart was updated:</strong><ul>' +
        notes.map(function (n) { return '<li>' + Util.esc(n) + '</li>'; }).join('') + '</ul></div>');
    }
    if (Auth.isLoggedIn()) customer = await Customers.get(Auth.user().uid);
  } catch (e) {
    $('#cartLines').html(Ui.empty('Could not load your cart: ' + e.message));
    return;
  }

  function usable(line) {
    const p = fresh[line.productId];
    return !!p && p.active !== false && p.qty > 0;
  }

  // ---------- 2. Render ----------
  function lineHtml(l) {
    const p = fresh[l.productId];
    const ok = usable(l);
    const max = ok ? p.qty : 0;
    return '<div class="cart-line' + (ok ? '' : ' unavailable') + '">' +
      Util.productImage(p ? p : { id: l.productId, title: l.title }, 'cart-thumb') +
      '<div><div class="product-title">' + Util.esc(l.title) + '</div>' +
        '<div class="muted small">' + Util.inr(l.price) + ' each · ' + (ok ? Ui.stockBadge(p.qty) : '<span class="badge badge-danger">Unavailable</span>') + '</div></div>' +
      '<div class="stepper">' +
        '<button data-act="dec" data-id="' + l.productId + '" aria-label="Decrease"' + (ok ? '' : ' disabled') + '>−</button>' +
        '<span>' + l.qty + '</span>' +
        '<button data-act="inc" data-id="' + l.productId + '" aria-label="Increase"' + (ok && l.qty < max ? '' : ' disabled') + '>+</button>' +
      '</div>' +
      '<div class="line-total">' + (ok ? Util.inr(l.price * l.qty) : '—') + '</div>' +
      '<button class="icon-btn" data-act="remove" data-id="' + l.productId + '" aria-label="Remove" title="Remove">×</button>' +
    '</div>';
  }

  function render() {
    const lines = Cart.items();
    if (!lines.length) {
      $('#cartLines').html(Ui.empty('Your cart is empty.', '<a class="btn btn-primary" href="index.html">Browse products</a>'));
      $('#summary').empty();
      return;
    }
    $('#cartLines').html('<h2>Items</h2>' + lines.map(lineHtml).join(''));

    const valid = lines.filter(usable);
    const hasUnavailable = valid.length !== lines.length;
    const subtotal = valid.reduce(function (s, l) { return s + l.price * l.qty; }, 0);
    const units = valid.reduce(function (n, l) { return n + l.qty; }, 0);

    const creditLimit = customer ? (customer.creditLimit || 0) : 0;
    const available = customer ? Customers.available(customer) : 0;
    const creditPossible = !!customer && creditLimit > 0;
    if (payMode === 'credit' && !creditPossible) payMode = 'cash';
    const creditShort = payMode === 'credit' && subtotal > available;

    let html = '<div class="card"><h2>Order summary</h2>' +
      '<div class="summary-row"><span>Items</span><span>' + units + '</span></div>' +
      '<div class="summary-row"><span>Subtotal</span><span>' + Util.inr(subtotal) + '</span></div>' +
      '<div class="summary-row"><span>Delivery</span><span>Free</span></div>' +
      '<div class="summary-row summary-total"><span>Total</span><span>' + Util.inr(subtotal) + '</span></div>';

    if (!Auth.isLoggedIn()) {
      html += '<p class="muted small">Sign in to choose a payment method and place your order.</p>' +
        '<a class="btn btn-primary btn-block" href="login.html?next=cart.html">Sign in to check out</a>';
    } else {
      html += '<div class="pay-options">' +
        '<button class="pay-option' + (payMode === 'cash' ? ' selected' : '') + '" data-pay="cash">Cash</button>' +
        '<button class="pay-option' + (payMode === 'credit' ? ' selected' : '') + '" data-pay="credit"' + (creditPossible ? '' : ' disabled title="No credit limit assigned"') + '>Credit</button>' +
      '</div>';
      if (payMode === 'credit') html += Ui.creditMeter(creditLimit, customer.creditUsed || 0, subtotal);
      else if (!creditPossible) html += '<p class="muted small">Credit is not available on your account yet.</p>';
      else html += '<p class="muted small">Pay cash on delivery. Available credit: ' + Util.inr(available) + '.</p>';

      let blockMsg = '';
      if (hasUnavailable) blockMsg = 'Remove unavailable items to continue.';
      else if (creditShort) blockMsg = 'Order exceeds your available credit by ' + Util.inr(subtotal - available) + '. Pay by cash or remove items.';
      html += '<div class="field-error" id="checkoutError" style="margin:10px 0">' + Util.esc(blockMsg) + '</div>' +
        '<button class="btn btn-primary btn-block" id="placeOrder"' + (blockMsg || !valid.length ? ' disabled' : '') + '>Place order · ' + Util.inr(subtotal) + '</button>';
    }
    html += '</div>';
    $('#summary').html(html);
  }

  // ---------- 3. Events ----------
  $('#cartLines').on('click', 'button[data-act]', function () {
    const id = $(this).attr('data-id');
    const act = $(this).attr('data-act');
    const p = fresh[id];
    let res;
    if (act === 'inc') res = Cart.setQty(id, Cart.qtyOf(id) + 1, p ? p.qty : 0);
    else if (act === 'dec') res = Cart.setQty(id, Cart.qtyOf(id) - 1);
    else res = Cart.remove(id);
    if (res.removed) {
      Ui.toast('"' + res.removed.title + '" removed', 'info', 'Undo', function () { Cart.restore(res.removed, res.index); render(); });
    }
    if (!res.ok && res.msg) Ui.toast(res.msg, 'error');
    render();
  });

  $('#summary').on('click', '[data-pay]', function () {
    payMode = $(this).attr('data-pay');
    render();
  });

  $('#summary').on('click', '#placeOrder', async function () {
    const $btn = $(this);
    Ui.busy($btn, true);
    try {
      const order = await Orders.placeOrder(payMode);
      location.href = 'bill.html?id=' + encodeURIComponent(order.id) + '&new=1';
    } catch (err) {
      $('#checkoutError').text(err.message);
      Ui.toast(err.message, 'error');
      Ui.busy($btn, false);
    }
  });

  render();
});
