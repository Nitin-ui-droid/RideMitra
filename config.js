/* =========================================================
   RIDEMITRA — GLOBAL CONFIGURATION
   Central configuration for the entire application
   ========================================================= */

"use strict";

const RIDEMITRA_CONFIG = Object.freeze({

   /* =====================================================
      APPLICATION
      ===================================================== */

   APP: {
      NAME: "RideMitra",
      VERSION: "2.0.0",
      ENVIRONMENT: "development"
   },


   /* =====================================================
      API
      Empty string means same domain
      ===================================================== */

   API_BASE_URL: "",

   ENDPOINTS: {
      LOGIN: "/api/login",
      REGISTER: "/api/register",
      LOGOUT: "/api/logout",

      RIDES: "/api/rides",
      BOOKINGS: "/api/bookings",

      PROFILE: "/api/profile",
      DASHBOARD: "/api/dashboard"
   },


   /* =====================================================
      STORAGE KEYS
      ===================================================== */

   STORAGE: {
      CURRENT_USER: "ridemitra_current_user",
      USERS: "ridemitra_users",

      LOGGED_IN: "ridemitra_logged_in",

      REMEMBER_ME: "ridemitra_remember_me",

      RIDES: "ridemitra_rides",

      BOOKINGS: "ridemitra_bookings",

      THEME: "ridemitra_theme"
   },


   /* =====================================================
      APPLICATION SETTINGS
      ===================================================== */

   SETTINGS: {

      MAX_PHONE_LENGTH: 10,

      MIN_PASSWORD_LENGTH: 6,

      DEFAULT_CURRENCY: "INR",

      DEFAULT_COUNTRY: "India"
   }

});


/* =========================================================
   API URL BUILDER
   ========================================================= */

function getApiUrl(endpoint = "") {

   const baseUrl = RIDEMITRA_CONFIG.API_BASE_URL
      .replace(/\/+$/, "");

   const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;

   return `${baseUrl}${cleanEndpoint}`;
}


/* =========================================================
   SAFE API REQUEST
   ========================================================= */

async function rideMitraFetch(endpoint, options = {}) {

   const url = getApiUrl(endpoint);

   const defaultHeaders = {
      "Content-Type": "application/json"
   };

   return fetch(url, {
      ...options,

      credentials: "same-origin",

      headers: {
         ...defaultHeaders,
         ...(options.headers || {})
      }
   });
}

/* =========================================================
   SAFE LOCAL STORAGE HELPERS
   ========================================================= */

function getStorageItem(key, fallback = null) {

   try {

      const value = localStorage.getItem(key);

      return value !== null
         ? value
         : fallback;

   } catch (error) {

      console.error(
         "RideMitra Storage Read Error:",
         error
      );

      return fallback;
   }
}


function setStorageItem(key, value) {

   try {

      localStorage.setItem(key, value);

      return true;

   } catch (error) {

      console.error(
         "RideMitra Storage Write Error:",
         error
      );

      return false;
   }
}


function removeStorageItem(key) {

   try {

      localStorage.removeItem(key);

      return true;

   } catch (error) {

      console.error(
         "RideMitra Storage Remove Error:",
         error
      );

      return false;
   }
}


/* =========================================================
   JSON STORAGE HELPERS
   ========================================================= */

function getStoredJSON(key, fallback = null) {

   try {

      const value = getStorageItem(key);

      if (!value) {
         return fallback;
      }

      return JSON.parse(value);

   } catch (error) {

      console.error(
         "RideMitra JSON Parse Error:",
         error
      );

      return fallback;
   }
}


function setStoredJSON(key, data) {

   return setStorageItem(
      key,
      JSON.stringify(data)
   );
}


/* =========================================================
   APPLICATION READY LOG
   ========================================================= */

console.log(
   `%c${RIDEMITRA_CONFIG.APP.NAME} v${RIDEMITRA_CONFIG.APP.VERSION} Ready`,
   "color:#ff5a1f;font-weight:bold;font-size:13px;"
); 