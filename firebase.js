import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("No user logged in");
    return;
  }

  console.log("Logged in UID:", user.uid);

  // STEP 1: check if user is a vendor
  const q = query(collection(db, "vendors"), where("ownerUid", "==", user.uid));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("User is NOT a vendor yet");
    return;
  }

  snapshot.forEach((doc) => {
    const vendorData = doc.data();
    console.log("Vendor found:", vendorData);

    // store globally
    window.currentVendor = vendorData;
  });
});
