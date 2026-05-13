import { auth, db } from "../../js/firebase.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// 🔥 ELEMENTS
const vendorEmail = document.getElementById("vendorEmail");
const logoutBtn = document.getElementById("logoutBtn");

const businessName = document.getElementById("businessName");
const businessNameCard = document.getElementById("businessNameCard");

const ownerName = document.getElementById("ownerName");
const category = document.getElementById("category");
const city = document.getElementById("city");
const phone = document.getElementById("phone");
const state = document.getElementById("state");
const address = document.getElementById("address");
const subCategory = document.getElementById("subCategory");
const description = document.getElementById("description");

const whatsappLink = document.getElementById("whatsappLink");
const vendorImage = document.getElementById("vendorImage");

// 🔥 AUTH CHECK
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    if (vendorEmail) {
      vendorEmail.textContent = user.email;
    }

    let data = null;

    // 🔥 FIRST CHECK NORMAL SIGNUP
    const directRef = doc(db, "vendors", user.uid);
    const directSnap = await getDoc(directRef);

    if (directSnap.exists()) {
      data = directSnap.data();
    } else {
      // 🔥 CHECK CLAIMED ACCOUNT
      const snapshot = await getDocs(collection(db, "vendors"));

      snapshot.forEach((item) => {
        const vendor = item.data();

        if (vendor.ownerUid === user.uid) {
          data = vendor;
        }
      });
    }

    if (!data) {
      alert("Vendor profile not found");
      return;
    }

    // 🔥 BASIC INFO
    if (businessName) {
      businessName.textContent = data.businessName || "N/A";
    }

    if (businessNameCard) {
      businessNameCard.textContent = data.businessName || "N/A";
    }

    if (ownerName) {
      ownerName.textContent = data.ownerName || "N/A";
    }

    if (category) {
      category.textContent = data.category || "N/A";
    }

    if (city) {
      city.textContent = data.city || "N/A";
    }

    if (phone) {
      phone.textContent = data.phone || "N/A";
    }

    if (state) {
      state.textContent = data.state || "N/A";
    }

    if (address) {
      address.textContent = data.address || "N/A";
    }

    if (subCategory) {
      subCategory.textContent = data.subCategory || "N/A";
    }

    if (description) {
      description.textContent = data.description || "No description yet.";
    }

    // 🔥 WHATSAPP FIX
    if (whatsappLink) {
      if (data.whatsapp) {
        let number = data.whatsapp.replace(/\D/g, "");

        if (number.startsWith("0")) {
          number = "234" + number.substring(1);
        }

        whatsappLink.href = "https://wa.me/" + number;

        whatsappLink.target = "_blank";

        whatsappLink.textContent = "Chat on WhatsApp";
      } else {
        whatsappLink.removeAttribute("href");

        whatsappLink.textContent = "No WhatsApp";
      }
    }

    // 🔥 IMAGE
    if (vendorImage) {
      vendorImage.src =
        data.imageUrl ||
        data.logoUrl ||
        data.profileImage ||
        "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(data.businessName || "OjaHub");
    }

    // 🔥 WELCOME NAME
    const welcomeName = document.getElementById("welcomeName");
    if (welcomeName) {
      welcomeName.textContent = data.businessName || data.ownerName || "";
    }
  } catch (error) {
    console.error(error);
    alert("Failed to load dashboard");
  }
});

// 🔥 LOGOUT
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);

      window.location.href = "../login/login.html";
    } catch (error) {
      alert("Logout failed");
    }
  });
}
