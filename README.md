# Online Shopping

An e-commerce web app built with **HTML, CSS, JavaScript and jQuery**, with **Axios** for all API calls (AJAX). jQuery handles the page (events, DOM); Axios handles HTTP requests, with a request interceptor that attaches the login token to every call. The backend is **Firebase**: Authentication and Cloud Firestore, both called through their REST APIs. Order emails go through **EmailJS**, and the site is hosted on **GitHub Pages** with auto-deploy via **GitHub Actions**.

## Features

### Customer
- Sign up (with validations), sign in, reset password; a verification email is sent on sign-up
- Browse products with search, category filter, sorting and pagination
- Cart with a +/− stepper: it can't go above the available stock, dropping to 0 removes the item (with Undo), and totals update live
- Cart re-checks prices and stock against the database before checkout
- Payment by **cash** or **credit** (credit limit check with a live credit meter)
- Atomic purchase: stock decrease, credit update and order creation either all succeed or none do
- Printable bill, order history and profile (name and mobile can be edited)
- Order confirmation email (EmailJS)

### Admin (single account: `admin@example.com`)
- Dashboard: today's and this month's sales, low stock, recent orders
- Categories CRUD: unique names, activate/deactivate, delete blocked while the category has products
- Products (inventory) CRUD: Id, category, title, description, quantity and price. Reading supports all, by category or a single item, with pagination. Everything except the Id can be updated. Activate/deactivate, and delete with a Yes/No confirmation (blocked if the product appears in past orders).
- Customers: set, change or remove a credit limit; block or unblock accounts
- Reports (date range):
  1. **Customer:** all customers, top 10 customers, cash purchase report, credit purchase report
  2. **Inventory:** current stock (all / by category), high stock (> 100), low stock (< 15)
  3. **Sales:** all, category-wise, cash, credit, top 10 and bottom 10 selling items

## Folder structure
```
index.html, login.html, signup.html, reset-password.html,
cart.html, bill.html, orders.html, profile.html     ← customer pages
admin/                                               ← admin pages
css/style.css                                        ← all styles
js/config.js                                         ← all settings (API key, admin email, limits)
js/core/      api.js (Firestore REST via Axios), auth.js (Auth REST via Axios), ui.js, util.js
js/services/  catalog, customers, cart, orders, email, reports  ← business logic
js/pages/     one script per page                                ← connects buttons to services
firestore.rules                                      ← security rules (paste into Firebase)
.github/workflows/deploy.yml                         ← auto-deploy to GitHub Pages
```

## Setup

1. **`js/config.js`**: fill in `API_KEY` and `PROJECT_ID` (from Firebase → Project settings → General).
2. **Firebase → Firestore → Rules**: paste the contents of `firestore.rules` → **Publish**.
3. **Firebase → Authentication → Settings → Authorized domains**: add `<your-username>.github.io`.
4. *(Optional)* **EmailJS**: create a free account → add an email service → create a template that uses `{{to_name}}`, `{{order_id}}`, `{{order_date}}`, `{{pay_mode}}`, `{{order_items}}`, `{{order_total}}`, and set the template's **To Email** field to `{{to_email}}`. Copy the Service ID, Template ID and Public Key into `CONFIG.EMAILJS`.
5. Run locally with VS Code **Live Server**, or push to GitHub (see below).

## Deploy (GitHub Pages)
Repo **Settings → Pages → Source: GitHub Actions**. Every push to `main` deploys automatically.
Site URL: `https://<your-username>.github.io/<repo-name>/`

## Key design decisions
- **Money is stored in paise (integers)** to avoid floating-point errors.
- **Orders store a snapshot** of each item's title, category and price, so old bills and reports never change.
- **Prices are recalculated from the database at checkout**, never trusted from the browser.
- **Purchases use a Firestore `commit` with preconditions**, so two buyers can't take the same last unit.
- **Security rules** enforce roles: only the admin manages the catalogue and credit limits; customers can only read and modify their own data, and can only decrease stock through purchases.
