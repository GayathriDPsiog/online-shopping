const CONFIG = {
  // From Firebase console → Project settings → General → Your apps → firebaseConfig
  API_KEY: 'AIzaSyAFfShBq2nNCUxDznSz8NacV3r_k-jozt8',
  PROJECT_ID: 'e-commerce-bd9c4',

  // The single admin account. Must match the email in firestore.rules.
  ADMIN_EMAIL: 'admin@example.com',

  PAGE_SIZE: 8,              // items per page in lists
  LOW_STOCK: 15,             // qty < 15  → low stock
  HIGH_STOCK: 100,           // qty > 100 → high stock
  DEFAULT_CREDIT_LIMIT: 0,   // paise. New customers start with no credit (trainer's decision)

  // EmailJS (order confirmation emails). Leave empty to skip emails.
  EMAILJS: {
    SERVICE_ID: '',
    TEMPLATE_ID: '',
    PUBLIC_KEY: ''
  }
};

// Derived values — do not edit
CONFIG.DOC_ROOT = 'projects/' + CONFIG.PROJECT_ID + '/databases/(default)/documents';
CONFIG.FS_BASE = 'https://firestore.googleapis.com/v1/' + CONFIG.DOC_ROOT;
