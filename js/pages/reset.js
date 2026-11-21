// ============================================================
// reset.js — ask Firebase to email a password reset link.
// The message is the same whether or not the email exists, so
// attackers can't discover which emails are registered.
// ============================================================
$(function () {
  Ui.renderHeader();

  $('#resetForm').on('submit', async function (e) {
    e.preventDefault();
    Ui.clearErrors($(this));
    $('#formError, #doneMsg').addClass('hidden');
    const email = $('#email').val().trim().toLowerCase();
    if (!Util.valid.email(email)) { Ui.fieldError($('#email'), 'Enter a valid email address.'); return; }

    const $btn = $('#submitBtn');
    Ui.busy($btn, true);
    try {
      await Auth.resetPassword(email);
      showDone();
    } catch (err) {
      // "Incorrect email or password" here would reveal the email doesn't exist — hide it
      if (/Incorrect email/.test(err.message)) showDone();
      else $('#formError').text(err.message).removeClass('hidden');
    } finally {
      Ui.busy($btn, false);
    }
  });

  function showDone() {
    $('#doneMsg').text('If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.').removeClass('hidden');
    $('#resetForm')[0].reset();
  }
});
