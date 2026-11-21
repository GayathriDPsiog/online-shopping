// ============================================================
// profile.js — view credit, edit name and mobile only.
// ============================================================
$(async function () {
  if (!Auth.requireCustomer()) return;
  Ui.renderHeader();

  const uid = Auth.user().uid;
  let c;
  try {
    c = await Customers.get(uid);
  } catch (e) {
    Ui.toast('Could not load your profile: ' + e.message, 'error');
    return;
  }
  if (!c) { Ui.toast('Profile not found. Sign out and sign in again.', 'error'); return; }

  $('#credit').html(Ui.creditMeter(c.creditLimit, c.creditUsed, 0));
  $('#email').val(c.email);
  $('#name').val(c.name);
  $('#mobile').val(c.mobile);
  $('#mobile').on('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });

  $('#profileForm').on('submit', async function (e) {
    e.preventDefault();
    Ui.clearErrors($(this));
    const name = $('#name').val().trim().replace(/\s+/g, ' ');
    const mobile = $('#mobile').val().trim();
    let ok = true;
    if (!Util.valid.name(name)) { Ui.fieldError($('#name'), 'Use letters only, 2–50 characters.'); ok = false; }
    if (!Util.valid.mobile(mobile)) { Ui.fieldError($('#mobile'), 'Enter a valid 10-digit mobile number.'); ok = false; }
    if (!ok) return;
    if (name === c.name && mobile === c.mobile) { Ui.toast('No changes to save.'); return; }

    const $btn = $('#saveBtn');
    Ui.busy($btn, true);
    try {
      await Customers.updateProfile(uid, { name: name, mobile: mobile });
      c.name = name; c.mobile = mobile;
      Ui.toast('Profile updated', 'success');
    } catch (err) {
      Ui.toast(err.message, 'error');
    } finally {
      Ui.busy($btn, false);
    }
  });
});
