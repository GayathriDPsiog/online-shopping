// ============================================================
// bill.js — printable bill for one order. Customers see their
// own orders; the admin can open any order.
// ============================================================
$(async function () {
  if (!Auth.isLoggedIn()) { location.href = 'login.html'; return; }
  Ui.renderHeader();
  if (Auth.isAdmin()) $('#backLink').attr('href', 'admin/reports.html').text('‹ Back to reports');

  const id = Util.qs('id');
  if (!id) { $('#billCard').html(Ui.empty('No order selected.')); return; }
  $('#billCard').html(Ui.skeleton(4, 'row-sk'));

  let o;
  try {
    o = await Orders.get(id);
  } catch (e) {
    $('#billCard').html(Ui.empty('Could not load this bill: ' + e.message));
    return;
  }
  if (!o) { $('#billCard').html(Ui.empty('Order not found.')); return; }

  if (Util.qs('new')) {
    $('#successMsg').html('<div class="notice notice-ok no-print"><strong>Order placed.</strong> ' +
      (Email.configured() ? 'A confirmation email is on its way to ' + Util.esc(o.customerEmail) + '.' : 'Thank you for shopping with us.') + '</div>');
  }

  const rows = Ui.table([
    { label: '#', render: function (r, i) { return i + 1; } },
    { label: 'Item', render: function (r) { return Util.esc(r.title); } },
    { label: 'Price', cls: 'right', render: function (r) { return Util.inr(r.price); } },
    { label: 'Qty', cls: 'right', render: function (r) { return r.qty; } },
    { label: 'Amount', cls: 'right', render: function (r) { return Util.inr(r.lineTotal); } }
  ], o.items || []);

  $('#billCard').html(
    '<div class="bill-head">' +
      '<div><div class="brand"><span class="brand-mark">O</span>OnlineShop</div><div class="muted small" style="margin-top:6px">Order bill</div></div>' +
      '<dl class="bill-meta">' +
        '<dt>Bill no.</dt><dd class="mono">' + Util.esc(o.id) + '</dd>' +
        '<dt>Date</dt><dd>' + Util.fmtDate(o.date) + '</dd>' +
        '<dt>Payment</dt><dd>' + (o.payMode === 'credit' ? 'Credit' : 'Cash') + '</dd>' +
      '</dl>' +
    '</div>' +
    '<p><strong>Billed to:</strong> ' + Util.esc(o.customerName) + ' · ' + Util.esc(o.customerEmail) + '</p>' +
    rows +
    '<div style="max-width:300px; margin-left:auto; margin-top:14px">' +
      '<div class="summary-row"><span>Items</span><span>' + o.itemCount + '</span></div>' +
      '<div class="summary-row summary-total"><span>Grand total</span><span>' + Util.inr(o.total) + '</span></div>' +
    '</div>' +
    '<p class="muted small" style="margin-top:24px">Prices shown are the prices at the time of purchase.</p>'
  );

  $('#printBtn').on('click', function () { window.print(); });
});
