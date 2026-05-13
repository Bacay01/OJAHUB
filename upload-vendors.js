import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAZRPoc-FkbdQ8ZNSkGIYFukU1TG-FJF6s",
  authDomain: "ojahub-c10d9.firebaseapp.com",
  projectId: "ojahub-c10d9",
  storageBucket: "ojahub-c10d9.firebasestorage.app",
  messagingSenderId: "896902243220",
  appId: "1:896902243220:web:7259724fe7865c281aa581"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 FULL 20 VENDORS
const vendorsBatch11 = [

{
  vendorId: "OJ220",
  businessName: "Asake Store",
  ownerName: "Akanbi Tawakiltu",
  phone: "08107564084",
  whatsapp: "https://wa.me/2348107564084",
  category: "Others",
  subCategory: "Others",
  city: "Ibadan",
  area: "Under G",
  description: "Retail shop for foodstuffs, household provisions, toiletries and snacks.",
  verified: true
},

{
  vendorId: "OJ221",
  businessName: "Luxe by Precous Interiors",
  ownerName: "Adebowale Precious",
  phone: "09010058719",
  whatsapp: "https://wa.me/2349010058719",
  category: "Others",
  subCategory: "Others",
  city: "Ogbomosho",
  area: "Challenge",
  description: "Quality products, affordable prices and customer satisfaction.",
  verified: true
},

{
  vendorId: "OJ222",
  businessName: "Iffy accessories",
  ownerName: "Ifeoluwa",
  phone: "07014523482",
  whatsapp: "https://wa.me/2347014523482",
  category: "Others",
  subCategory: "Others",
  city: "Ibadan",
  area: "Isale General",
  description: "Jewelry accessories vendor.",
  verified: true
},

{
  vendorId: "OJ223",
  businessName: "Rymah’s place",
  ownerName: "Karimat Oluwadamilola",
  phone: "09159555344",
  whatsapp: "https://wa.me/2349159555344",
  category: "Beauty",
  subCategory: "Beauty& Cosmetics",
  city: "Ibadan",
  area: "Under G",
  description: "Nail technician and body piercing services.",
  verified: true
},

{
  vendorId: "OJ224",
  businessName: "God’s Real Enterprises (Golddealer)",
  ownerName: "Ibrahim Mafus Adenrele",
  phone: "07050916084",
  whatsapp: "https://wa.me/2347050916084",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ibadan",
  area: "Akala Express",
  description: "Real golds, luxury watches and jewelries.",
  verified: true
},

{
  vendorId: "OJ225",
  businessName: "Footies By Fida",
  ownerName: "Omolola",
  phone: "09067629956",
  whatsapp: "https://wa.me/2349067629956",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ogbomosho",
  area: "Felele",
  description: "Handmade shoes in varieties for male and female, retail and wholesale.",
  verified: true
},

{
  vendorId: "OJ226",
  businessName: "Kickswrld Lifestyle",
  ownerName: "Akinmoladun Obasegun",
  phone: "08133434574",
  whatsapp: "https://wa.me/2348133434574",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ibadan",
  area: "Akala Express",
  description: "Sales and production of footwear for male and female.",
  verified: true
},

{
  vendorId: "OJ227",
  businessName: "Yinniescroche",
  ownerName: "Adeosun Fiyinfoluwa",
  phone: "07040777548",
  whatsapp: "https://wa.me/2347040777548",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ogbomosho",
  area: "Apete",
  description: "Beautiful unisex handmade crochet clothing and accessories.",
  verified: true
},

{
  vendorId: "OJ228",
  businessName: "Nio_surprise",
  ownerName: "Maryam Eniola",
  phone: "08160913281",
  whatsapp: "https://wa.me/2348160913281",
  category: "Others",
  subCategory: "Others",
  city: "Ogbomosho",
  area: "Yoaco",
  description: "Birthday, anniversary and thoughtful surprise gifts vendor.",
  verified: true
},

{
  vendorId: "OJ229",
  businessName: "Taste Avon Foods",
  ownerName: "Kiladejo Blessing",
  phone: "08109166810",
  whatsapp: "https://wa.me/2348109166810",
  category: "Food",
  subCategory: "Food(Cooked meal)",
  city: "Ogbomosho",
  area: "Under G",
  description: "Quality meals delivery brand.",
  verified: true
},

{
  vendorId: "OJ230",
  businessName: "Preshie’s Bakes n treat",
  ownerName: "Adetomiwa Adegbenro",
  phone: "07082696443",
  whatsapp: "https://wa.me/2347082696443",
  category: "Food",
  subCategory: "Food(Cooked meal)",
  city: "Ibadan",
  area: "Aroje",
  description: "Cakes, pastries, food tray, small chops, zobo and yogurt.",
  verified: true
},

{
  vendorId: "OJ231",
  businessName: "Blings By Melanie",
  ownerName: "Adewunmi",
  phone: "08051454589",
  whatsapp: "https://wa.me/2348051454589",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ibadan",
  area: "Under G",
  description: "Premium jewelry and accessories for males and females.",
  verified: true
},

{
  vendorId: "OJ232",
  businessName: "PemisireGadgets",
  ownerName: "Pemisire",
  phone: "08078971703",
  whatsapp: "https://wa.me/2348078971703",
  category: "Phone",
  subCategory: "Phone",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Buy, sell and swap phones and gadgets.",
  verified: true
},

{
  vendorId: "OJ233",
  businessName: "Shop@tifeh",
  ownerName: "Boluwatife",
  phone: "09034563593",
  whatsapp: "https://wa.me/2349034563593",
  category: "Others",
  subCategory: "Others",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Perfumes and lipgloss vendor.",
  verified: true
},

{
  vendorId: "OJ234",
  businessName: "SETTLED STYLE HAVEN",
  ownerName: "Similoluwa",
  phone: "09077191766",
  whatsapp: "https://wa.me/2349077191766",
  category: "Beauty",
  subCategory: "Beauty& Cosmetics",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Cluster lashes, hair, makeup and training services.",
  verified: true
},

{
  vendorId: "OJ235",
  businessName: "Ife’s Essence",
  ownerName: "Ifeoluwa",
  phone: "09114279186",
  whatsapp: "https://wa.me/2349114279186",
  category: "Beauty",
  subCategory: "Beauty& Cosmetics",
  city: "Ibadan",
  area: "Ibadan",
  description: "Perfume and skincare essentials.",
  verified: true
},

{
  vendorId: "OJ236",
  businessName: "Tola’s Thrift",
  ownerName: "Bamidele Omotolani Esther",
  phone: "09049540698",
  whatsapp: "https://wa.me/2349049540698",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Affordable thrifted wears.",
  verified: true
},

{
  vendorId: "OJ237",
  businessName: "Ife’s Essence🌸",
  ownerName: "Ifeoluwa🍒",
  phone: "09114279186",
  whatsapp: "https://wa.me/2349114279186",
  category: "Beauty",
  subCategory: "Beauty& Cosmetics",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Smell good, glow better skincare brand.",
  verified: true
},

{
  vendorId: "OJ238",
  businessName: "FINDS BY CELIA VENTURES",
  ownerName: "Pricilia",
  phone: "09169451342",
  whatsapp: "https://wa.me/2349169451342",
  category: "Others",
  subCategory: "Others",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Luxury bags and perfume vendor.",
  verified: true
},

{
  vendorId: "OJ239",
  businessName: "Bikeh Aesthetic",
  ownerName: "Adeola",
  phone: "09070561261",
  whatsapp: "https://wa.me/2349070561261",
  category: "Others",
  subCategory: "Others",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Affordable beauty and self-care essentials.",
  verified: true
},

{
  vendorId: "OJ240",
  businessName: "Shopmeraaccessories",
  ownerName: "Mera",
  phone: "09070132366",
  whatsapp: "https://wa.me/2349070132366",
  category: "Fashion",
  subCategory: "Fashion &Clothing",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Hair accessories including clips, bands and scarves.",
  verified: true
},

{
  vendorId: "OJ241",
  businessName: "Zigic Ventures",
  ownerName: "Sanyaolu Idris Adekunle",
  phone: "09068786467",
  whatsapp: "https://wa.me/2349068786467",
  category: "Phone",
  subCategory: "Phone",
  city: "Ogbomosho",
  area: "Ogbomosho",
  description: "Brand new, UK and Nigerian used phones, gadgets and electronics.",
  verified: true
}

];


// 🔥 UPLOAD
async function uploadVendors() {

for (const vendor of vendorsBatch11) {

await setDoc(doc(db, "vendors", vendor.vendorId), vendor);

console.log(vendor.businessName + " uploaded ✅");
}

alert("20 Vendors Uploaded Successfully 🚀");
}

uploadVendors();