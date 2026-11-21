// ============================================================
// login.js — sign in, then send admin to the dashboard and
// customers back to where they came from (or the shop).
// ============================================================
$(function () {
  // Already signed in? Go straight in.
  if (Auth.isAdmin()) { location.href = 'admin/index.html'; return; }
  if (Auth.isLoggedIn()) { location.href = 'index.html'; return; }
  Ui.renderHeader();

  // Only allow redirects to our own pages (security: no open redirects)
  function nextPage() {
    const n = Util.qs('next');
    return n && /^[a-z-]+\.html(\?[\w=&%-]*)?$/i.test(n) ? n : 'index.html';
  }

  $('#loginForm').on('submit', async function (e) {
    e.preventDefault();
    const $form = $(this);
    Ui.clearErrors($form);
    $('#formError').addClass('hidden');

    const email = $('#email').val().trim().toLowerCase();
    const password = $('#password').val();
    let ok = true;
    if (!Util.valid.email(email)) { Ui.fieldError($('#email'), 'Enter a valid email address.'); ok = false; }
    if (!password) { Ui.fieldError($('#password'), 'Enter your password.'); ok = false; }
    if (!ok) return;

    const $btn = $('#submitBtn');
    Ui.busy($btn, true);
    try {
      const s = await Auth.signIn(email, password);
      if (Auth.isAdmin()) { location.href = 'admin/index.html'; return; }

      // Customer: make sure a profile exists and is not blocked
      let profile = await Customers.get(s.uid);
      if (!profile) profile = await Customers.create(s.uid, { name: email.split('@')[0], email: email, mobile: '' });
      if (profile.active === false) {
        Auth.logout(false);
        throw new Error('Your account has been blocked. Please contact the store.');
      }
      location.href = nextPage();
    } catch (err) {
      $('#formError').text(err.message).removeClass('hidden');
      Ui.busy($btn, false);
    }
  });
});
