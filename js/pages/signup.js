// ============================================================
// signup.js — validate, create the Auth account, create the
// customer profile (credit limit 0), send verification email.
// ============================================================
$(function () {
  if (Auth.isLoggedIn()) { location.href = Auth.isAdmin() ? 'admin/index.html' : 'index.html'; return; }
  Ui.renderHeader();

  // Mobile: digits only while typing
  $('#mobile').on('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });

  $('#signupForm').on('submit', async function (e) {
    e.preventDefault();
    const $form = $(this);
    Ui.clearErrors($form);
    $('#formError').addClass('hidden');

    const name = $('#name').val().trim().replace(/\s+/g, ' ');
    const email = $('#email').val().trim().toLowerCase();
    const mobile = $('#mobile').val().trim();
    const password = $('#password').val();
    const confirm = $('#confirm').val();

    let ok = true;
    if (!Util.valid.name(name)) { Ui.fieldError($('#name'), 'Use letters only, 2–50 characters.'); ok = false; }
    if (!Util.valid.email(email)) { Ui.fieldError($('#email'), 'Enter a valid email address.'); ok = false; }
    else if (email === CONFIG.ADMIN_EMAIL.toLowerCase()) { Ui.fieldError($('#email'), 'This email is reserved.'); ok = false; }
    if (!Util.valid.mobile(mobile)) { Ui.fieldError($('#mobile'), 'Enter a valid 10-digit mobile number.'); ok = false; }
    if (!Util.valid.password(password)) { Ui.fieldError($('#password'), 'At least 6 characters.'); ok = false; }
    if (password !== confirm) { Ui.fieldError($('#confirm'), 'Passwords do not match.'); ok = false; }
    if (!ok) return;

    const $btn = $('#submitBtn');
    Ui.busy($btn, true);
    try {
      const s = await Auth.signUp(email, password);
      await Customers.create(s.uid, { name: name, email: email, mobile: mobile });
      Auth.sendVerification(s.idToken).catch(function () { /* not critical */ });
      Ui.toast('Account created. Welcome, ' + name + '!', 'success');
      setTimeout(function () { location.href = 'index.html'; }, 900);
    } catch (err) {
      $('#formError').text(err.message).removeClass('hidden');
      Ui.busy($btn, false);
    }
  });
});
