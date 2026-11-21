// ============================================================
// email.js — order confirmation email through the EmailJS REST
// API. If EmailJS is not configured in config.js, it is skipped.
// ============================================================
const Email = {
  configured() {
    const c = CONFIG.EMAILJS;
    return !!(c.SERVICE_ID && c.TEMPLATE_ID && c.PUBLIC_KEY);
  },

  async sendOrderEmail(order) {
    if (!Email.configured()) {
      console.info('EmailJS is not configured in js/config.js — order email skipped.');
      return false;
    }
    const lines = order.items.map(function (i) {
      return i.title + '  x ' + i.qty + '  = ' + Util.inr(i.lineTotal);
    }).join('\n');
    await $.ajax({
      url: 'https://api.emailjs.com/api/v1.0/email/send',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        service_id: CONFIG.EMAILJS.SERVICE_ID,
        template_id: CONFIG.EMAILJS.TEMPLATE_ID,
        user_id: CONFIG.EMAILJS.PUBLIC_KEY,
        template_params: {
          to_email: order.customerEmail,
          to_name: order.customerName,
          order_id: order.id,
          order_date: Util.fmtDate(order.date),
          pay_mode: order.payMode === 'credit' ? 'Credit' : 'Cash',
          order_items: lines,
          order_total: Util.inr(order.total)
        }
      })
    });
    return true;
  }
};
