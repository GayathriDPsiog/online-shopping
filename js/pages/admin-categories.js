// ============================================================
// admin-categories.js — category CRUD with unique names,
// activate/deactivate and protected delete.
// ============================================================
$(async function () {
  if (!Auth.requireAdmin()) return;
  Ui.renderHeader();

  let cats = [], productCount = {}, page = 1;

  function validName($input) {
    const name = $input.val().trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 40) { Ui.fieldError($input, 'Name must be 2–40 characters.'); return null; }
    return name;
  }

  async function load() {
    $('#list').html(Ui.skeleton(4, 'row-sk'));
    try {
      const res = await Promise.all([Catalog.getCategories(), Catalog.getProducts()]);
      cats = res[0];
      productCount = {};
      res[1].forEach(function (p) { productCount[p.catId] = (productCount[p.catId] || 0) + 1; });
      render();
    } catch (e) {
      $('#list').html(Ui.empty('Could not load categories: ' + e.message));
    }
  }

  function render() {
    const q = $('#search').val().trim().toLowerCase();
    const list = cats.filter(function (c) { return !q || (c.name || '').toLowerCase().indexOf(q) !== -1; });
    const info = Ui.paginate(list, page, CONFIG.PAGE_SIZE);
    page = info.page;
    $('#resultInfo').text(info.total ? 'Showing ' + info.start + '–' + info.end + ' of ' + info.total : '');
    $('#list').html(Ui.table([
      { label: 'Name', render: function (c) { return '<strong>' + Util.esc(c.name) + '</strong>'; } },
      { label: 'Id', render: function (c) { return '<span class="mono muted">' + Util.esc(c.id) + '</span>'; } },
      { label: 'Products', cls: 'right', render: function (c) { return productCount[c.id] || 0; } },
      { label: 'Status', render: function (c) { return Ui.statusBadge(c.active); } },
      { label: 'Actions', render: function (c) {
        return '<div class="actions">' +
          '<button class="btn-link" data-act="edit" data-id="' + c.id + '">Edit</button>' +
          '<button class="btn-link" data-act="toggle" data-id="' + c.id + '">' + (c.active === false ? 'Activate' : 'Deactivate') + '</button>' +
          '<button class="btn-link danger" data-act="delete" data-id="' + c.id + '">Delete</button></div>';
      } }
    ], info.items, q ? 'No categories match "' + q + '".' : 'No categories yet. Add your first one above.'));
    Ui.pager($('#pager'), info, function (p) { page = p; render(); });
  }

  // ---------- Create ----------
  $('#addForm').on('submit', async function (e) {
    e.preventDefault();
    Ui.clearErrors($(this));
    const name = validName($('#newName'));
    if (!name) return;
    const $btn = $('#addBtn');
    Ui.busy($btn, true);
    try {
      await Catalog.createCategory(name);
      $('#newName').val('');
      Ui.toast('Category "' + name + '" added', 'success');
      await load();
    } catch (err) {
      Ui.fieldError($('#newName'), err.message);
    } finally {
      Ui.busy($btn, false);
    }
  });

  // ---------- Edit / toggle / delete ----------
  $('#list').on('click', 'button[data-act]', async function () {
    const id = $(this).attr('data-id');
    const c = cats.find(function (x) { return x.id === id; });
    const act = $(this).attr('data-act');

    if (act === 'edit') {
      Ui.modal({
        title: 'Edit category',
        body: '<form novalidate><div class="field"><label>Id</label><input readonly value="' + Util.esc(c.id) + '"></div>' +
          '<div class="field"><label for="editName">Name</label><input id="editName" maxlength="40" value="' + Util.esc(c.name) + '"><div class="field-error"></div></div></form>',
        onOk: async function ($m) {
          const $in = $m.find('#editName');
          const name = validName($in);
          if (!name) return false;
          if (name === c.name) return true;
          try { await Catalog.renameCategory(c.id, name); }
          catch (err) { Ui.fieldError($in, err.message); return false; }
          Ui.toast('Category renamed', 'success');
          await load();
        }
      });
    }

    if (act === 'toggle') {
      const to = c.active === false;
      if (!to && (productCount[c.id] || 0) > 0) {
        const ok = await Ui.confirm('Deactivating "' + c.name + '" hides its ' + productCount[c.id] + ' product(s) from customers. Continue?', 'Deactivate');
        if (!ok) return;
      }
      try {
        await Catalog.setCategoryActive(c.id, to);
        Ui.toast('"' + c.name + '" ' + (to ? 'activated' : 'deactivated'), 'success');
        await load();
      } catch (err) { Ui.toast(err.message, 'error'); }
    }

    if (act === 'delete') {
      const ok = await Ui.confirm('Delete category "' + c.name + '"? This cannot be undone.', 'Delete');
      if (!ok) return;
      try {
        await Catalog.deleteCategory(c.id);
        Ui.toast('Category deleted', 'success');
        await load();
      } catch (err) { Ui.toast(err.message, 'error'); }
    }
  });

  $('#search').on('input', Util.debounce(function () { page = 1; render(); }, 250));
  load();
});
