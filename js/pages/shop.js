// ============================================================
// shop.js — product listing: search, category filter, sort,
// pagination, add to cart with +/− stepper capped at stock.
// ============================================================
$(async function () {
  if (Auth.isAdmin()) { location.href = 'admin/index.html'; return; }
  Ui.renderHeader();

  const $grid = $('#grid');
  let products = [], catName = {}, page = 1;

  $grid.html(Ui.skeleton(8, 'card-sk'));
  try {
    const res = await Promise.all([Catalog.getCategories(), Catalog.getProducts()]);
    const activeCats = res[0].filter(function (c) { return c.active !== false; });
    const activeIds = {};
    activeCats.forEach(function (c) { activeIds[c.id] = true; catName[c.id] = c.name; });
    // Customers only see active products in active categories
    products = res[1].filter(function (p) { return p.active !== false && activeIds[p.catId]; });
    $('#catFilter').append(activeCats.map(function (c) {
      return '<option value="' + c.id + '">' + Util.esc(c.name) + '</option>';
    }).join(''));
  } catch (e) {
    $grid.html(Ui.empty('Could not load products: ' + e.message));
    return;
  }

  function filtered() {
    const q = $('#search').val().trim().toLowerCase();
    const cat = $('#catFilter').val();
    const sort = $('#sort').val();
    const list = products.filter(function (p) {
      return (!cat || p.catId === cat) &&
        (!q || (p.titleLower || '').indexOf(q) !== -1 || (p.desc || '').toLowerCase().indexOf(q) !== -1);
    });
    list.sort(function (a, b) {
      if (sort === 'priceAsc') return a.price - b.price;
      if (sort === 'priceDesc') return b.price - a.price;
      if (sort === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      return a.title.localeCompare(b.title);
    });
    return list;
  }

  function card(p) {
    const inCart = Cart.qtyOf(p.id);
    const soldOut = p.qty <= 0;
    let action;
    if (soldOut) action = '<button class="btn btn-ghost btn-sm" disabled>Sold out</button>';
    else if (inCart) {
      action = '<div class="stepper"><button data-act="dec" data-id="' + p.id + '" aria-label="Decrease">−</button><span>' + inCart +
        '</span><button data-act="inc" data-id="' + p.id + '" aria-label="Increase"' + (inCart >= p.qty ? ' disabled title="No more stock"' : '') + '>+</button></div>';
    } else action = '<button class="btn btn-primary btn-sm" data-act="add" data-id="' + p.id + '">Add to cart</button>';

    const link = 'product.html?id=' + encodeURIComponent(p.id);
    const count = Util.imagesOf(p).length;
    return '<article class="product' + (soldOut ? ' soldout' : '') + '">' +
      '<a href="' + link + '" class="product-link" aria-label="View ' + Util.esc(p.title) + '">' + Util.productImage(p, 'product-tile') + '</a>' +
      '<div class="product-body">' +
        '<div class="product-cat">' + Util.esc(catName[p.catId] || '') + (count > 1 ? ' · ' + count + ' photos' : '') + '</div>' +
        '<a href="' + link + '" class="product-link"><div class="product-title">' + Util.esc(p.title) + '</div></a>' +
        '<div class="product-desc">' + Util.esc(p.desc) + '</div>' +
        '<div>' + Ui.stockBadge(p.qty) + '</div>' +
        '<div class="product-foot"><span class="price">' + Util.inr(p.price) + '</span>' + action + '</div>' +
      '</div></article>';
  }

  function render() {
    const list = filtered();
    const info = Ui.paginate(list, page, CONFIG.PAGE_SIZE);
    page = info.page;
    $('#resultInfo').text(info.total ? 'Showing ' + info.start + '–' + info.end + ' of ' + info.total : '');
    if (!info.total) {
      const q = $('#search').val().trim();
      $grid.html(Ui.empty(q ? 'No products match "' + q + '".' : 'No products available yet.',
        q || $('#catFilter').val() ? '<button class="btn btn-ghost" id="clearFilters">Clear filters</button>' : ''));
    } else {
      $grid.html(info.items.map(card).join(''));
    }
    Ui.pager($('#pager'), info, function (p) { page = p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // ---------- Events ----------
  $('#search').on('input', Util.debounce(function () { page = 1; render(); }, 300));
  $('#catFilter, #sort').on('change', function () { page = 1; render(); });
  $grid.on('click', '#clearFilters', function () { $('#search').val(''); $('#catFilter').val(''); page = 1; render(); });

  $grid.on('click', 'button[data-act]', function () {
    const id = $(this).attr('data-id');
    const p = products.find(function (x) { return x.id === id; });
    const act = $(this).data('act');
    let res;
    if (act === 'add') {
      res = Cart.add(p, 1);
      if (res.ok) Ui.toast('"' + p.title + '" added to cart', 'success');
    } else if (act === 'inc') {
      res = Cart.setQty(id, Cart.qtyOf(id) + 1, p.qty);
    } else {
      res = Cart.setQty(id, Cart.qtyOf(id) - 1, p.qty);
      if (res.removed) Ui.toast('"' + p.title + '" removed from cart', 'info', 'Undo', function () { Cart.restore(res.removed, res.index); render(); });
    }
    if (res && !res.ok && res.msg) Ui.toast(res.msg, 'error');
    render();
  });

  render();
});
