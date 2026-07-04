const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./zgadulica-firebase-adminsdk-fbsvc-4126a0ac8c.json"); 

// Inicjalizacja aplikacji w nowoczesny sposób
initializeApp({
  credential: cert(serviceAccount)
});

// Tutaj wklej UID usera, który ma być adminem
const userUid = "6jFyc4qFBhf0RPAZel9EwoNedpY2"; 

getAuth().setCustomUserClaims(userUid, { admin: true })
  .then(() => {
    console.log("✅ Sukces! Gość otrzymał niepodrabialny glejt admina.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Błąd podczas nadawania admina:", error);
    process.exit(1);
  });