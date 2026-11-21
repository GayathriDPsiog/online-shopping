// ============================================================
// catalog.js — categories and products (business rules).
// ============================================================
const Catalog = {

  // ---------- Categories ----------
  async getCategories() {
    const list = await Api.listAll('categories');
    return list.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
  },

  // Unique-name rule (case-insensitive) using nameLower
  async categoryNameTaken(name, excludeId) {
    const found = await Api.query('categories', [['nameLower', '==', name.trim().toLowerCase()]], 2);
    return found.some(function (c) { return c.id !== excludeId; });
  },

  async createCategory(name) {
    name = name.trim();
    if (await this.categoryNameTaken(name)) throw new Error('A category named "' + name + '" already exists.');
    return Api.create('categories', { name: name, nameLower: name.toLowerCase(), active: true, createdAt: new Date() });
  },

  async renameCategory(id, name) {
    name = name.trim();
    if (await this.categoryNameTaken(name, id)) throw new Error('A category named "' + name + '" already exists.');
    return Api.update('categories', id, { name: name, nameLower: name.toLowerCase() });
  },

  setCategoryActive(id, active) {
    return Api.update('categories', id, { active: active });
  },

  // Block delete if products still use this category (avoids orphan products)
  async deleteCategory(id) {
    const used = await Api.query('products', [['catId', '==', id]], 1);
    if (used.length) throw new Error('This category still has products. Move or delete them first, or deactivate the category instead.');
    return Api.remove('categories', id);
  },

  // ---------- Products ----------
  async getProducts() {
    const list = await Api.listAll('products');
    return list.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
  },

  getProduct(id) {
    return Api.get('products', id);
  },

  // data = { catId, title, desc, price (paise), qty, images: [url, url, ...] }
  // The database stores only image URLs; the pages load the pictures from them.
  createProduct(data) {
    const now = new Date();
    return Api.create('products', {
      catId: data.catId, title: data.title, titleLower: data.title.toLowerCase(), desc: data.desc,
      price: data.price, qty: data.qty, images: data.images || [], active: true, createdAt: now, updatedAt: now
    });
  },

  // Everything except the Id can be updated (as per the requirement)
  updateProduct(id, data) {
    return Api.update('products', id, {
      catId: data.catId, title: data.title, titleLower: data.title.toLowerCase(), desc: data.desc,
      price: data.price, qty: data.qty, images: data.images || [], imageUrl: '', updatedAt: new Date()
    });
  },

  setProductActive(id, active) {
    return Api.update('products', id, { active: active, updatedAt: new Date() });
  },

  // Block delete if the product appears in any past order (bills/reports need it)
  async deleteProduct(id) {
    const used = await Api.query('orders', [['productIds', 'array-contains', id]], 1);
    if (used.length) throw new Error('This product appears in past orders, so it cannot be deleted. Deactivate it instead.');
    return Api.remove('products', id);
  }
};
