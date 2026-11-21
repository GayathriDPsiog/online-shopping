// ============================================================
// customers.js — customer profiles and credit limits.
// Document ID = Firebase Auth UID.
// ============================================================
const Customers = {

  get(uid) {
    return Api.get('customers', uid);
  },

  create(uid, profile) {
    return Api.create('customers', {
      name: profile.name,
      email: profile.email.toLowerCase(),
      mobile: profile.mobile || '',
      creditLimit: CONFIG.DEFAULT_CREDIT_LIMIT,
      creditUsed: 0,
      active: true,
      createdAt: new Date()
    }, uid);
  },

  // Customers may change only their name and mobile
  updateProfile(uid, profile) {
    return Api.update('customers', uid, { name: profile.name, mobile: profile.mobile });
  },

  async list() {
    const list = await Api.listAll('customers');
    return list.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
  },

  available(c) {
    return Math.max(0, (c.creditLimit || 0) - (c.creditUsed || 0));
  },

  // Admin: create/update/remove a credit limit (remove = set to 0)
  setCreditLimit(customer, limitPaise) {
    const max = CONFIG.MAX_CREDIT_LIMIT || 100000;
    if (limitPaise > max) {
      throw new Error('The maximum credit limit is ' + Util.inr(max) + '.');
    }
    if (limitPaise < (customer.creditUsed || 0)) {
      throw new Error('The limit cannot be lower than the credit already used (' + Util.inr(customer.creditUsed) + ').');
    }
    return Api.update('customers', customer.id, { creditLimit: limitPaise });
  },

  setActive(id, active) {
    return Api.update('customers', id, { active: active });
  }
};
