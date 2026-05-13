import { auth, db } from "../../js/firebase.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// 🔥 URL PARAM
const params = new URLSearchParams(
  window.location.search
);

const vendorId =
  params.get("vendorId");

// 🔥 DOM
const title =
  document.getElementById(
    "businessTitle"
  );

const form =
  document.getElementById(
    "claimForm"
  );

const msg =
  document.getElementById("msg");

// INPUTS
const businessNameInput =
  document.getElementById(
    "businessName"
  );

const ownerNameInput =
  document.getElementById(
    "ownerName"
  );

const phoneInput =
  document.getElementById(
    "phone"
  );

// const whatsappInput =
//   document.getElementById(
//     "whatsapp"
//   );

const emailInput =
  document.getElementById(
    "email"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const categoryInput =
  document.getElementById(
    "category"
  );

const subCategoryInput =
  document.getElementById(
    "subCategory"
  );

const descriptionInput =
  document.getElementById(
    "description"
  );

const cityInput =
  document.getElementById(
    "city"
  );

const stateInput =
  document.getElementById(
    "state"
  );

const addressInput =
  document.getElementById(
    "address"
  );

const imageFile =
  document.getElementById(
    "imageFile"
  );

let vendorData = null;

// 🔥 LOAD BUSINESS
async function loadVendor() {

  try {

    if (!vendorId) {

      msg.style.color = "red";
      msg.textContent =
        "Invalid vendor link";

      form.style.display =
        "none";

      return;
    }

    const ref =
      doc(
        db,
        "vendors",
        vendorId
      );

    const snap =
      await getDoc(ref);

    if (!snap.exists()) {

      msg.style.color = "red";
      msg.textContent =
        "Business not found";

      form.style.display =
        "none";

      return;
    }

    vendorData =
      snap.data();

    title.textContent =
      vendorData.businessName ||
      "Claim Business";

    // PREFILL
    businessNameInput.value =
      vendorData.businessName ||
      "";

   
    // whatsappInput.value =
    //   vendorData.whatsapp ||
    //   "";

    categoryInput.value =
      vendorData.category ||
      "";

    subCategoryInput.value =
      vendorData.subCategory ||
      "";

    descriptionInput.value =
      vendorData.description ||
      "";

    cityInput.value =
      vendorData.city || "";

    stateInput.value =
      vendorData.state || "";

    addressInput.value =
      vendorData.address ||
      "";

    // ALREADY CLAIMED
    if (
      vendorData.claimed ===
      true
    ) {

      msg.style.color = "red";

      msg.textContent =
        "This business has already been claimed";

      form.style.display =
        "none";

      return;
    }

  } catch (error) {

    console.error(error);

    msg.style.color = "red";

    msg.textContent =
      "Failed to load business";

    form.style.display =
      "none";

  }

}

loadVendor();

// SUBMIT CLAIM
form.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    if (!vendorData) {

      msg.style.color = "red";

      msg.textContent =
        "Invalid vendor";

      return;
    }

    const businessName =
      businessNameInput.value.trim();

    const ownerName =
      ownerNameInput.value.trim();

    const phone =
      phoneInput.value.trim();

    const whatsapp = phone;

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value.trim();

    const category =
      categoryInput.value.trim();

    const subCategory =
      subCategoryInput.value.trim();

    const description =
      descriptionInput.value.trim();

    const city =
      cityInput.value.trim();

    const state =
      stateInput.value.trim();

    const address =
      addressInput.value.trim();

    // VALIDATION
    if (
      !businessName ||
      !ownerName ||
      !phone ||
      !email ||
      !password
    ) {

      msg.style.color = "red";

      msg.textContent =
        "Please fill all required fields";

      return;
    }

    // PHONE CHECK
msg.style.color = "#1554d1";
msg.textContent = "Verifying phone number...";

let enteredPhone =
phone.replace(/\D/g, "");

let savedPhone =
(vendorData.phone || "")
.replace(/\D/g, "");

// convert 0810... to 234810...
if (enteredPhone.startsWith("0")) {
  enteredPhone =
  "234" + enteredPhone.slice(1);
}

if (savedPhone.startsWith("0")) {
  savedPhone =
  "234" + savedPhone.slice(1);
}

// remove + if already entered
if (enteredPhone.startsWith("234") === false &&
enteredPhone.startsWith("810")) {
  enteredPhone = "234" + enteredPhone;
}

if (enteredPhone !== savedPhone) {

  msg.style.color = "red";

  msg.textContent =
  "The number entered does not match the registered business number.";

  return;
}

    try {

      msg.style.color =
        "#1554d1";

      msg.textContent =
        "Creating account...";

      // 🔥 IMAGE UPLOAD
      let imageUrl =
        vendorData.imageUrl ||
        "";

      const file =
        imageFile.files[0];

      if (file) {

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "upload_preset",
          "ojahub_upload"
        );

        const res =
          await fetch(
            "https://api.cloudinary.com/v1_1/ds3zdc11c/image/upload",
            {
              method:"POST",
              body:formData
            }
          );

        const data =
          await res.json();

        if (
          data.secure_url
        ) {

          imageUrl =
            data.secure_url;

        }

      }

      // CREATE AUTH
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user =
        userCredential.user;

      // UPDATE FIRESTORE
      await updateDoc(
        doc(
          db,
          "vendors",
          vendorId
        ),
        {
          claimed: true,
          ownerUid:
            user.uid,
          businessName,
          ownerName,
          phone,
          whatsapp,
          email,
          category,
          subCategory,
          description,
          city,
          state,
          address,
          imageUrl
        }
      );

      msg.style.color =
        "green";

      msg.textContent =
        "Business claimed successfully";

      setTimeout(() => {

        window.location.href =
          "../dashboard/dashboard.html";

      }, 1200);

    } catch (error) {

      console.error(error);

      msg.style.color =
        "red";

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        msg.textContent =
          "Email already in use";

      } else if (
        error.code ===
        "auth/weak-password"
      ) {

        msg.textContent =
          "Password must be at least 6 characters";

      } else {

        msg.textContent =
          "Something went wrong";

      }

    }

  }
);