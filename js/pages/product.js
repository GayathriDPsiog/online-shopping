// ============================================================
// product.js — product details page: swipeable image gallery
// (arrows, thumbnails, swipe on phones), full description,
// stock, quantity stepper and "more from this category".
// Open it as product.html?id=<productId>
// ============================================================
$(async function () {
  if (Auth.isAdmin()) { location.href = 'admin/products.html'; return; }
  Ui.renderHeader();

  const id = Util.qs('id');
  if (!id) { $('#product').html(Ui.empty('No product selected.', '<a class="btn btn-primary" href="index.html">Back to shop</a>')); return; }
  $('#product').html(Ui.skeleton(1, 'card-sk'));

  let p, cats, all;
  try {
    const res = await Promise.all([Catalog.getProduct(id), Catalog.getCategories(), Catalog.getProducts()]);
    p = res[0]; cats = res[1]; all = res[2];
  } catch (e) {
    $('#product').html(Ui.empty('Could not load this product: ' + e.message));
    return;
  }
  const cat = p ? cats.find(function (c) { return c.id === p.catId; }) : null;
  if (!p || p.active === false || !cat || cat.active === false) {
    $('#product').html(Ui.empty('This product is not available.', '<a class="btn btn-primary" href="index.html">Back to shop</a>'));
    return;
  }

  document.title = p.title + ' · OnlineShop';
  $('#crumb').html('<a href="index.html">Shop</a> › ' + Util.esc(cat.name) + ' › ' + Util.esc(p.title));

  const images = Util.imagesOf(p);
  const hue = Util.hue(p.catId);
  const letter = Util.esc(p.title.charAt(0).toUpperCase());

  // ---------- Gallery markup ----------
  let slides = images.map(function (url, i) {
    return '<div class="gallery-slide" style="background:hsl(' + hue + ',45%,48%)"><span>' + letter + '</span>' +
      '<img src="' + Util.esc(Util.imgSrc(url)) + '" alt="' + Util.esc(p.title) + ' photo ' + (i + 1) + '"' + (i ? ' loading="lazy"' : '') + ' onerror="this.remove()"></div>';
  }).join('');
  if (!images.length) slides = '<div class="gallery-slide" style="background:hsl(' + hue + ',45%,48%)"><span>' + letter + '</span></div>';

  const gallery = '<div class="gallery">' +
      '<div class="gallery-track" id="track">' + slides + '</div>' +
      (images.length > 1
        ? '<button class="gallery-nav prev" id="prevImg" aria-label="Previous photo">‹</button>' +
          '<button class="gallery-nav next" id="nextImg" aria-label="Next photo">›</button>' +
          '<span class="gallery-count" id="imgCount">1 / ' + images.length + '</span>'
        : '') +
    '</div>' +
    (images.length > 1
      ? '<div class="thumbs">' + images.map(function (url, i) {
          return '<button class="thumb' + (i ? '' : ' active') + '" data-i="' + i + '" aria-label="Photo ' + (i + 1) + '"><img src="' + Util.esc(Util.imgSrc(url)) + '" alt="" loading="lazy" onerror="this.remove()"></button>';
        }).join('') + '</div>'
      : '');

  $('#product').html(
    '<div class="pd-layout">' +
      '<div>' + gallery + '</div>' +
      '<div class="pd-info">' +
        '<div class="product-cat">' + Util.esc(cat.name) + '</div>' +
        '<h1>' + Util.esc(p.title) + '</h1>' +
        '<div class="pd-price">' + Util.inr(p.price) + '</div>' +
        '<div>' + Ui.stockBadge(p.qty) + '</div>' +
        '<p class="pd-desc">' + Util.esc(p.desc) + '</p>' +
        '<div class="pd-buy" id="buyBox"></div>' +
        '<div class="pd-meta">' +
          '<div>Pay by cash on delivery or store credit</div>' +
          '<div>Product Id: <span class="mono">' + Util.esc(p.id) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );

  // ---------- Gallery behaviour (scroll-snap does the swiping) ----------
  const track = document.getElementById('track');
  let current = 0;
  function goTo(i) {
    current = Math.max(0, Math.min(images.length - 1, i));
    track.scrollTo({ left: current * track.clientWidth, behavior: 'smooth' });
  }
  function syncUi() {
    current = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    $('#imgCount').text((current + 1) + ' / ' + images.length);
    $('.thumb').removeClass('active').filter('[data-i="' + current + '"]').addClass('active');
    $('#prevImg').prop('disabled', current === 0);
    $('#nextImg').prop('disabled', current === images.length - 1);
  }
  if (images.length > 1) {
    $('#prevImg').on('click', function () { goTo(current - 1); });
    $('#nextImg').on('click', function () { goTo(current + 1); });
    $('.thumbs').on('click', '.thumb', function () { goTo(+$(this).attr('data-i')); });
    track.addEventListener('scroll', Util.debounce(syncUi, 60));
    $(document).on('keydown', function (e) {
      if (e.key === 'ArrowLeft') goTo(current - 1);
      if (e.key === 'ArrowRight') goTo(current + 1);
    });
    syncUi();
  }

  // ---------- Buy box: Add to cart / stepper capped at stock ----------
  function renderBuy() {
    const inCart = Cart.qtyOf(p.id);
    let html;
    if (p.qty <= 0) html = '<button class="btn btn-ghost" disabled>Out of stock</button>';
    else if (!inCart) html = '<button class="btn btn-primary" id="addBtn">Add to cart</button>';
    else {
      html = '<div class="stepper"><button data-act="dec" aria-label="Decrease">−</button><span>' + inCart + '</span>' +
        '<button data-act="inc" aria-label="Increase"' + (inCart >= p.qty ? ' disabled title="No more stock"' : '') + '>+</button></div>' +
        '<a class="btn btn-primary" href="cart.html">Go to cart</a>';
    }
    $('#buyBox').html(html);
  }
  $('#buyBox').on('click', '#addBtn', function () {
    const r = Cart.add(p, 1);
    if (r.ok) Ui.toast('"' + p.title + '" added to cart', 'success'); else Ui.toast(r.msg, 'error');
    renderBuy();
  });
  $('#buyBox').on('click', '[data-act]', function () {
    const act = $(this).attr('data-act');
    const r = Cart.setQty(p.id, Cart.qtyOf(p.id) + (act === 'inc' ? 1 : -1), p.qty);
    if (r.removed) Ui.toast('"' + p.title + '" removed from cart', 'info', 'Undo', function () { Cart.restore(r.removed, r.index); renderBuy(); });
    if (!r.ok && r.msg) Ui.toast(r.msg, 'error');
    renderBuy();
  });
  renderBuy();

  // ---------- More from this category ----------
  const related = all.filter(function (x) { return x.catId === p.catId && x.id !== p.id && x.active !== false; }).slice(0, 4);
  if (related.length) {
    $('#related').html('<div class="section-title" style="margin-top:36px"><h2>More in ' + Util.esc(cat.name) + '</h2></div><div class="grid">' +
      related.map(function (r) {
        const link = 'product.html?id=' + encodeURIComponent(r.id);
        return '<article class="product"><a class="product-link" href="' + link + '">' + Util.productImage(r, 'product-tile') + '</a>' +
          '<div class="product-body"><a class="product-link" href="' + link + '"><div class="product-title">' + Util.esc(r.title) + '</div></a>' +
          '<div>' + Ui.stockBadge(r.qty) + '</div><div class="product-foot"><span class="price">' + Util.inr(r.price) + '</span>' +
          '<a class="btn btn-ghost btn-sm" href="' + link + '">View</a></div></div></article>';
      }).join('') + '</div>');
  }
});
