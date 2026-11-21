// ============================================================
// admin-products.js — inventory CRUD: create, read (filter by
// category, single item, pagination), update all fields except
// Id, activate/deactivate, delete with confirmation.
// ============================================================
$(async function () {
  if (!Auth.requireAdmin()) return;
  Ui.renderHeader();

  let products = [], cats = [], catName = {}, page = 1;

  async function load() {
    $('#list').html(Ui.skeleton(6, 'row-sk'));
    try {
      const res = await Promise.all([Catalog.getCategories(), Catalog.getProducts()]);
      cats = res[0]; products = res[1];
      catName = {};
      cats.forEach(function (c) { catName[c.id] = c.name; });
      const current = $('#catFilter').val();
      $('#catFilter').html('<option value="">All categories</option>' + cats.map(function (c) {
        return '<option value="' + c.id + '">' + Util.esc(c.name) + (c.active === false ? ' (inactive)' : '') + '</option>';
      }).join('')).val(current || '');
      render();
    } catch (e) {
      $('#list').html(Ui.empty('Could not load products: ' + e.message));
    }
  }

  function filtered() {
    const q = $('#search').val().trim().toLowerCase();
    const cat = $('#catFilter').val();
    const st = $('#statusFilter').val();
    return products.filter(function (p) {
      if (cat && p.catId !== cat) return false;
      if (q && (p.titleLower || '').indexOf(q) === -1 && p.id.toLowerCase() !== q) return false;
      if (st === 'active' && p.active === false) return false;
      if (st === 'inactive' && p.active !== false) return false;
      if (st === 'low' && !(p.qty < CONFIG.LOW_STOCK)) return false;
      if (st === 'high' && !(p.qty > CONFIG.HIGH_STOCK)) return false;
      return true;
    });
  }

  function render() {
    const info = Ui.paginate(filtered(), page, CONFIG.PAGE_SIZE);
    page = info.page;
    $('#resultInfo').text(info.total ? 'Showing ' + info.start + '–' + info.end + ' of ' + info.total : '');
    $('#list').html(Ui.table([
      { label: 'Product', render: function (p) {
        return '<div class="prod-cell">' + Util.productImage(p, 'admin-thumb') +
          '<div><strong>' + Util.esc(p.title) + '</strong><div class="muted small mono">' + Util.esc(p.id) + '</div></div></div>';
      } },
      { label: 'Category', render: function (p) { return Util.esc(catName[p.catId] || '(missing)'); } },
      { label: 'Price', cls: 'right', render: function (p) { return Util.inr(p.price); } },
      { label: 'Stock', render: function (p) { return Ui.stockBadge(p.qty, true); } },
      { label: 'Status', render: function (p) { return Ui.statusBadge(p.active); } },
      { label: 'Actions', render: function (p) {
        return '<div class="actions">' +
          '<button class="btn-link" data-act="edit" data-id="' + p.id + '">Edit</button>' +
          '<button class="btn-link" data-act="toggle" data-id="' + p.id + '">' + (p.active === false ? 'Activate' : 'Deactivate') + '</button>' +
          '<button class="btn-link danger" data-act="delete" data-id="' + p.id + '">Delete</button></div>';
      } }
    ], info.items, products.length ? 'No products match these filters.' : 'No products yet. Click "Add product" to create one.'));
    Ui.pager($('#pager'), info, function (p) { page = p; render(); });
  }

  // ---------- Add / edit form (one form for both) ----------
  function formHtml(p) {
    const activeCats = cats.filter(function (c) { return c.active !== false || (p && c.id === p.catId); });
    return '<form novalidate>' +
      (p ? '<div class="field"><label>Id</label><input readonly value="' + Util.esc(p.id) + '"><div class="hint">The Id cannot be changed.</div></div>' : '') +
      '<div class="field"><label for="fTitle">Title</label><input id="fTitle" maxlength="80" value="' + Util.esc(p ? p.title : '') + '"><div class="field-error"></div></div>' +
      '<div class="field"><label for="fCat">Category</label><select id="fCat"><option value="">Choose a category</option>' +
        activeCats.map(function (c) { return '<option value="' + c.id + '"' + (p && p.catId === c.id ? ' selected' : '') + '>' + Util.esc(c.name) + '</option>'; }).join('') +
      '</select><div class="field-error"></div></div>' +
      '<div class="field"><label for="fImg">Image URLs <span class="muted">(optional, one per line, up to 6)</span></label>' +
        '<textarea id="fImg" rows="3" placeholder="https://example.com/photo-1.jpg&#10;https://example.com/photo-2.jpg">' + Util.esc(p ? Util.imagesOf(p).join('\n') : '') + '</textarea>' +
        '<div class="hint">The first image is the main photo. Use direct https links to .jpg / .png / .webp images.</div>' +
        '<div class="field-error"></div>' +
        '<div class="img-preview" id="imgPreview"></div></div>' +
      '<div class="field"><label for="fDesc">Description</label><textarea id="fDesc" maxlength="500">' + Util.esc(p ? p.desc : '') + '</textarea><div class="field-error"></div></div>' +
      '<div class="form-row">' +
        '<div class="field"><label for="fPrice">Price (₹)</label><input id="fPrice" inputmode="decimal" placeholder="499.00" value="' + (p ? Util.toRupeesText(p.price) : '') + '"><div class="field-error"></div></div>' +
        '<div class="field"><label for="fQty">Quantity in stock</label><input id="fQty" inputmode="numeric" placeholder="20" value="' + (p ? p.qty : '') + '"><div class="field-error"></div></div>' +
      '</div></form>';
  }

  function readForm($m) {
    Ui.clearErrors($m);
    const title = $m.find('#fTitle').val().trim().replace(/\s+/g, ' ');
    const catId = $m.find('#fCat').val();
    const desc = $m.find('#fDesc').val().trim();
    const price = Util.toPaise($m.find('#fPrice').val());
    const qtyText = $m.find('#fQty').val().trim();
    const images = imageLines($m);
    let ok = true;
    if (images.length > 6) { Ui.fieldError($m.find('#fImg'), 'Add at most 6 images.'); ok = false; }
    else if (!images.every(Util.valid.imageUrl)) { Ui.fieldError($m.find('#fImg'), 'Each line must be a full https:// link (or images/filename.jpg).'); ok = false; }
    if (title.length < 2) { Ui.fieldError($m.find('#fTitle'), 'Enter a title (at least 2 characters).'); ok = false; }
    if (!catId) { Ui.fieldError($m.find('#fCat'), 'Choose a category.'); ok = false; }
    if (desc.length < 5) { Ui.fieldError($m.find('#fDesc'), 'Enter a short description (at least 5 characters).'); ok = false; }
    if (isNaN(price) || price <= 0) { Ui.fieldError($m.find('#fPrice'), 'Enter a price above 0, up to 2 decimals (e.g. 499.50).'); ok = false; }
    if (!Util.valid.wholeNumber(qtyText) || parseInt(qtyText, 10) > 100000) { Ui.fieldError($m.find('#fQty'), 'Enter a whole number from 0 to 100000.'); ok = false; }
    if (!ok) return null;
    return { title: title, catId: catId, desc: desc, price: price, qty: parseInt(qtyText, 10), images: images };
  }

  // Non-empty lines of the image box, duplicates removed
  function imageLines($m) {
    const seen = {};
    return $m.find('#fImg').val().split('\n')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { if (!s || seen[s]) return false; seen[s] = true; return true; });
  }

  // Live preview of every image URL, so the admin sees which links work
  function wirePreview($m) {
    function show() {
      const $box = $m.find('#imgPreview').empty();
      imageLines($m).forEach(function (url) {
        if (!Util.valid.imageUrl(url)) { $box.append($('<span class="preview-bad"></span>').text('Invalid link')); return; }
        const $img = $('<img alt="Preview">').attr('src', Util.imgSrc(url));
        $img.on('error', function () { $(this).replaceWith('<span class="preview-bad">Failed to load</span>'); });
        $box.append($img);
      });
    }
    $m.find('#fImg').on('input', Util.debounce(show, 400));
    show();
  }

  function titleClash(title, excludeId) {
    const t = title.toLowerCase();
    return products.some(function (p) { return p.id !== excludeId && p.titleLower === t; });
  }

  $('#addBtn').on('click', function () {
    if (!cats.some(function (c) { return c.active !== false; })) { Ui.toast('Create an active category first.', 'error'); return; }
    const m = Ui.modal({
      title: 'Add product', okText: 'Create product', body: formHtml(null),
      onOk: async function ($m) {
        const data = readForm($m);
        if (!data) return false;
        if (titleClash(data.title) && !(await Ui.confirm('A product called "' + data.title + '" already exists. Create another one anyway?', 'Create', false))) return false;
        await Catalog.createProduct(data);
        Ui.toast('Product created', 'success');
        await load();
      }
    });
    wirePreview(m.$el);
  });

  $('#list').on('click', 'button[data-act]', async function () {
    const id = $(this).attr('data-id');
    const p = products.find(function (x) { return x.id === id; });
    const act = $(this).attr('data-act');

    if (act === 'edit') {
      const m = Ui.modal({
        title: 'Edit product', okText: 'Save changes', body: formHtml(p),
        onOk: async function ($m) {
          const data = readForm($m);
          if (!data) return false;
          await Catalog.updateProduct(p.id, data);
          Ui.toast('Product updated', 'success');
          await load();
        }
      });
      wirePreview(m.$el);
    }

    if (act === 'toggle') {
      try {
        await Catalog.setProductActive(p.id, p.active === false);
        Ui.toast('"' + p.title + '" ' + (p.active === false ? 'activated' : 'deactivated'), 'success');
        await load();
      } catch (err) { Ui.toast(err.message, 'error'); }
    }

    if (act === 'delete') {
      const ok = await Ui.confirm('Delete "' + p.title + '"? This cannot be undone.', 'Delete');
      if (!ok) return;
      try {
        await Catalog.deleteProduct(p.id);
        Ui.toast('Product deleted', 'success');
        await load();
      } catch (err) { Ui.toast(err.message, 'error'); }
    }
  });

  $('#search').on('input', Util.debounce(function () { page = 1; render(); }, 250));
  $('#catFilter, #statusFilter').on('change', function () { page = 1; render(); });
  load();
});
