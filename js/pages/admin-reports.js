// ============================================================
// admin-reports.js — the three report groups from the brief:
// 1. Customer  2. Inventory  3. Sales (all date-range based
// except current stock).
// ============================================================
$(async function () {
  if (!Auth.requireAdmin()) return;
  Ui.renderHeader();

  // Default range: first day of this month → today
  const today = Util.ymd(new Date());
  $('#from').val(today.slice(0, 8) + '01');
  $('#to').val(today);

  let data = null;
  const catName = {};

  $('.tab-panel').html(Ui.skeleton(5, 'row-sk'));
  try {
    data = await Reports.loadAll();
    data.categories.forEach(function (c) { catName[c.id] = c.name; });
  } catch (e) {
    $('#tab-customers').html(Ui.empty('Could not load report data: ' + e.message));
    $('#tab-inventory, #tab-sales').empty();
    return;
  }

  // ---------- helpers ----------
  function section(title, subtitle, html) {
    return '<div class="section-title"><h2>' + title + '</h2><span class="muted small">' + (subtitle || '') + '</span></div>' + html;
  }
  function kpi(label, value) {
    return '<div class="kpi"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div></div>';
  }
  function billLink(o) {
    return '<a class="mono" href="../bill.html?id=' + encodeURIComponent(o.id) + '">' + Util.esc(o.id) + '</a>';
  }
  function orderTable(list, emptyMsg) {
    let html = Ui.table([
      { label: 'Date', render: function (o) { return Util.fmtDate(o.date); } },
      { label: 'Bill no.', render: billLink },
      { label: 'Customer', render: function (o) { return Util.esc(o.customerName); } },
      { label: 'Payment', render: function (o) { return o.payMode === 'credit' ? 'Credit' : 'Cash'; } },
      { label: 'Items', cls: 'right', render: function (o) { return o.itemCount; } },
      { label: 'Total', cls: 'right', render: function (o) { return Util.inr(o.total); } }
    ], list, emptyMsg);
    if (list.length) html += '<p class="right" style="margin:8px 4px 0"><strong>Total: ' + Util.inr(Reports.sum(list, 'total')) + '</strong> across ' + list.length + ' order(s)</p>';
    return html;
  }
  function productTable(list, emptyMsg) {
    return Ui.table([
      { label: 'Product', render: function (p) { return Util.esc(p.title); } },
      { label: 'Category', render: function (p) { return Util.esc(catName[p.catId] || '-'); } },
      { label: 'Price', cls: 'right', render: function (p) { return Util.inr(p.price); } },
      { label: 'Stock', cls: 'right', render: function (p) { return Ui.stockBadge(p.qty, true); } },
      { label: 'Stock value', cls: 'right', render: function (p) { return Util.inr(p.price * p.qty); } },
      { label: 'Status', render: function (p) { return Ui.statusBadge(p.active); } }
    ], list, emptyMsg);
  }

  // ---------- 1. Customer reports ----------
  function renderCustomers(orders) {
    const top = Reports.topCustomers(orders, 10);
    const cash = Reports.byPayMode(orders, 'cash');
    const credit = Reports.byPayMode(orders, 'credit');
    $('#tab-customers').html(
      section('All customers', data.customers.length + ' customer(s) · all columns', Ui.table([
        { label: 'Name', render: function (c) { return Util.esc(c.name); } },
        { label: 'Email', render: function (c) { return Util.esc(c.email); } },
        { label: 'Mobile', render: function (c) { return Util.esc(c.mobile || '-'); } },
        { label: 'Credit limit', cls: 'right', render: function (c) { return Util.inr(c.creditLimit); } },
        { label: 'Credit used', cls: 'right', render: function (c) { return Util.inr(c.creditUsed); } },
        { label: 'Available', cls: 'right', render: function (c) { return Util.inr(Customers.available(c)); } },
        { label: 'Status', render: function (c) { return c.active === false ? 'Blocked' : 'Active'; } },
        { label: 'Joined', render: function (c) { return Util.fmtDay(c.createdAt); } }
      ], data.customers, 'No customers yet.')) +
      section('Top 10 customers', 'by purchase value in the selected dates', Ui.table([
        { label: '#', render: function (r, i) { return i + 1; } },
        { label: 'Customer', render: function (r) { return Util.esc(r.name) + '<div class="muted small">' + Util.esc(r.email) + '</div>'; } },
        { label: 'Orders', cls: 'right', render: function (r) { return r.orders; } },
        { label: 'Cash', cls: 'right', render: function (r) { return Util.inr(r.cash); } },
        { label: 'Credit', cls: 'right', render: function (r) { return Util.inr(r.credit); } },
        { label: 'Total', cls: 'right', render: function (r) { return '<strong>' + Util.inr(r.total) + '</strong>'; } }
      ], top, 'No purchases in this date range.')) +
      section('Cash purchase report', 'selected dates', orderTable(cash, 'No cash purchases in this date range.')) +
      section('Credit purchase report', 'selected dates', orderTable(credit, 'No credit purchases in this date range.'))
    );
  }

  // ---------- 2. Inventory reports (current stock; not date-based) ----------
  function renderInventory() {
    const cat = $('#invCat').val() || '';
    const all = Reports.stock(data.products, cat);
    const units = Reports.sum(all, 'qty');
    const value = all.reduce(function (s, p) { return s + p.price * p.qty; }, 0);
    $('#tab-inventory').html(
      '<div class="toolbar no-print"><label for="invCat" class="muted">Category</label><select id="invCat"><option value="">All categories</option>' +
        data.categories.map(function (c) { return '<option value="' + c.id + '"' + (c.id === cat ? ' selected' : '') + '>' + Util.esc(c.name) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="kpis">' + kpi('Products', all.length) + kpi('Units in stock', units) + kpi('Stock value', Util.inr(value)) + '</div>' +
      section('Current stock', cat ? 'category: ' + Util.esc(catName[cat]) : 'all categories', productTable(all, 'No products.')) +
      section('High stock', 'more than ' + CONFIG.HIGH_STOCK + ' units', productTable(Reports.highStock(all), 'No products above ' + CONFIG.HIGH_STOCK + ' units.')) +
      section('Low stock', 'fewer than ' + CONFIG.LOW_STOCK + ' units', productTable(Reports.lowStock(all), 'No products below ' + CONFIG.LOW_STOCK + ' units.'))
    );
  }
  $('#tab-inventory').on('change', '#invCat', renderInventory);

  // ---------- 3. Sales reports ----------
  function renderSales(orders) {
    const mode = $('#salesMode').val() || '';
    const shown = mode ? Reports.byPayMode(orders, mode) : orders;
    const byCat = Reports.salesByCategory(orders, data.categories);
    const top = Reports.topItems(orders, data.products, 10);
    const bottom = Reports.bottomItems(orders, data.products, 10);
    const itemCols = [
      { label: '#', render: function (r, i) { return i + 1; } },
      { label: 'Product', render: function (r) { return Util.esc(r.title); } },
      { label: 'Category', render: function (r) { return Util.esc(catName[r.catId] || '-'); } },
      { label: 'Units sold', cls: 'right', render: function (r) { return r.units; } },
      { label: 'Revenue', cls: 'right', render: function (r) { return Util.inr(r.revenue); } }
    ];
    $('#tab-sales').html(
      '<div class="kpis">' +
        kpi('Orders', orders.length) +
        kpi('Units sold', Reports.sum(orders, 'itemCount')) +
        kpi('Total sales', Util.inr(Reports.sum(orders, 'total'))) +
        kpi('Cash sales', Util.inr(Reports.sum(Reports.byPayMode(orders, 'cash'), 'total'))) +
        kpi('Credit sales', Util.inr(Reports.sum(Reports.byPayMode(orders, 'credit'), 'total'))) +
      '</div>' +
      section('Category-wise sales', 'selected dates', Ui.table([
        { label: 'Category', render: function (r) { return Util.esc(r.name); } },
        { label: 'Units sold', cls: 'right', render: function (r) { return r.units; } },
        { label: 'Revenue', cls: 'right', render: function (r) { return Util.inr(r.revenue); } }
      ], byCat, 'No sales in this date range.')) +
      section('Top 10 selling items', 'by units sold', Ui.table(itemCols, top, 'No sales in this date range.')) +
      section('Bottom 10 selling items', 'includes items with zero sales', Ui.table(itemCols, bottom, 'No products yet.')) +
      '<div class="section-title"><h2>Sales list</h2><select id="salesMode" class="no-print" style="width:auto">' +
        '<option value=""' + (mode === '' ? ' selected' : '') + '>All sales</option>' +
        '<option value="cash"' + (mode === 'cash' ? ' selected' : '') + '>Cash sales</option>' +
        '<option value="credit"' + (mode === 'credit' ? ' selected' : '') + '>Credit sales</option>' +
      '</select></div>' +
      orderTable(shown, 'No sales in this date range.')
    );
  }
  $('#tab-sales').on('change', '#salesMode', function () { renderSales(currentOrders()); });

  // ---------- Range + tabs ----------
  function currentOrders() {
    return Reports.inRange(data.orders, $('#from').val(), $('#to').val());
  }
  function renderAll() {
    $('#rangeText').text('Showing ' + Util.fmtDay(Util.dayStart($('#from').val())) + ' to ' + Util.fmtDay(Util.dayStart($('#to').val())));
    const orders = currentOrders();
    renderCustomers(orders);
    renderInventory();
    renderSales(orders);
  }

  $('#rangeForm').on('submit', function (e) {
    e.preventDefault();
    $('#rangeError').text('');
    const from = $('#from').val(), to = $('#to').val();
    if (!from || !to) { $('#rangeError').text('Choose both dates.'); return; }
    if (from > to) { $('#rangeError').text('"From" date must be on or before "To" date.'); return; }
    renderAll();
  });
  $('#printBtn').on('click', function () { window.print(); });

  function showTab(name) {
    $('.tab').removeClass('active').filter('[data-tab="' + name + '"]').addClass('active');
    $('.tab-panel').addClass('hidden');
    $('#tab-' + name).removeClass('hidden');
  }
  $('.tab').on('click', function () { showTab($(this).attr('data-tab')); history.replaceState(null, '', '#' + $(this).attr('data-tab')); });

  renderAll();
  const hash = location.hash.replace('#', '');
  if (['customers', 'inventory', 'sales'].indexOf(hash) !== -1) showTab(hash);
});
