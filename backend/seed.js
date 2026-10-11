// seed.js — Run with: node seed.js
// Seeds: 1 admin, 5 manufacturers, 5 logistics companies, 20 orders, bids

import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
dotenv.config();

import db from "./db/database.js";
import User from "./models/userModel.js";
import Order from "./models/orderModel.js";
import PriceOffer from "./models/priceOfferModel.js";

const NEPAL_CITIES = ["Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur", "Biratnagar", "Birgunj", "Dharan", "Janakpur", "Hetauda", "Nepalgunj", "Butwal", "Dhangadhi", "Itahari", "Bharatpur", "Gorkha"];
const VEHICLE_TYPES = ["motorcycle", "small_van", "large_van", "truck", "large_truck"];
const PRODUCT_TYPES = ["Cotton fabric rolls", "Electronics components", "Handicraft items", "Pharmaceutical supplies", "Construction materials", "Food grains", "Garment products", "Industrial machinery parts", "Furniture", "Agricultural produce", "Spices and herbs", "Ceramic products", "Paper and stationery", "Plastic goods", "Metal sheets"];
const MFG_SUFFIXES = ["Industries Pvt. Ltd.", "Manufacturing Co.", "Exports Pvt. Ltd.", "Products Ltd.", "Enterprises", "Works Pvt. Ltd."];
const LOG_SUFFIXES = ["Logistics Pvt. Ltd.", "Transport Co.", "Cargo Services", "Freight Solutions", "Express Delivery", "Movers Pvt. Ltd."];
const ORDER_STATUSES = ["pending", "accepted", "in transit", "delivered", "cancelled"];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function generateOrderId() { return "ORD-" + Date.now() + "-" + randomInt(1000, 9999); }
function nepaliCompanyName(suffixes) { return `${faker.person.lastName()} ${randomFrom(suffixes)}`; }
async function hashPassword(plain) { return bcrypt.hash(plain, 10); }

async function seed() {
  console.log("✅ SQLite database ready\n");

  // Clear existing non-admin data
  db.prepare("DELETE FROM price_offer").run();
  db.prepare('DELETE FROM "order"').run();
  db.prepare("DELETE FROM user WHERE role != 'admin'").run();
  db.prepare("DELETE FROM user WHERE role = 'admin'").run();
  console.log("🗑️  Cleared existing seed data\n");

  const password = await hashPassword("Password@123");

  // ── Admin ─────────────────────────────────────────────────────────────────
  User.create({
    companyName: "RouteFlow Admin",
    role: "admin",
    email: "admin@routeflow.com",
    password,
    isVerified: true,
    otpHash: null,
    otpExpires: null,
  });
  // Update admin with extra fields directly
  const adminUser = User.findByEmail("admin@routeflow.com");
  User.update(adminUser.id, { isAccountVerified: true, submittedForVerification: true });
  console.log("👑 Admin: admin@routeflow.com");

  // ── Manufacturers ─────────────────────────────────────────────────────────
  const manufacturers = [];
  for (let i = 0; i < 5; i++) {
    const user = User.create({
      companyName: nepaliCompanyName(MFG_SUFFIXES),
      role: "manufacturer",
      email: `manufacturer${i + 1}@routeflow.com`,
      password,
      isVerified: true,
    });
    User.update(user.id, {
      contactNumber: `98${randomInt(10000000, 99999999)}`,
      panNo: `${randomInt(100000000, 999999999)}`,
      companyLocation: randomFrom(NEPAL_CITIES),
      companyDescription: faker.company.catchPhrase(),
      isAccountVerified: true,
      submittedForVerification: true,
    });
    manufacturers.push(User.findById(user.id));
    console.log(`👷 Manufacturer: ${user.companyName} (${user.email})`);
  }

  // ── Logistics companies ───────────────────────────────────────────────────
  const logisticsCompanies = [];
  for (let i = 0; i < 5; i++) {
    const user = User.create({
      companyName: nepaliCompanyName(LOG_SUFFIXES),
      role: "logistics",
      email: `logistics${i + 1}@routeflow.com`,
      password,
      isVerified: true,
    });
    User.update(user.id, {
      contactNumber: `98${randomInt(10000000, 99999999)}`,
      panNo: `${randomInt(100000000, 999999999)}`,
      companyLocation: randomFrom(NEPAL_CITIES),
      companyDescription: faker.company.catchPhrase(),
      isAccountVerified: true,
      submittedForVerification: true,
    });
    logisticsCompanies.push(User.findById(user.id));
    console.log(`🚛 Logistics: ${user.companyName} (${user.email})`);
  }

  console.log("");

  // ── Orders + Bids ─────────────────────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const manufacturer = randomFrom(manufacturers);
    const fromCity = randomFrom(NEPAL_CITIES);
    const toCity = randomFrom(NEPAL_CITIES.filter((c) => c !== fromCity));
    const status = randomFrom(ORDER_STATUSES);
    const orderId = generateOrderId();

    const assignedLogistics = ["accepted", "in transit", "delivered"].includes(status) ? randomFrom(logisticsCompanies) : null;

    const order = Order.create({
      orderId,
      manufacturerId: manufacturer.id,
      logisticsId: assignedLogistics?.id ?? null,
      productDetails: randomFrom(PRODUCT_TYPES),
      quantity: randomInt(10, 500),
      weight: randomInt(5, 2000),
      vehicleType: randomFrom(VEHICLE_TYPES),
      invoiceNeeded: faker.datatype.boolean(),
      vatBillNeeded: faker.datatype.boolean(),
      expectedPrice: randomInt(5000, 80000),
      routeFrom: fromCity,
      routeTo: toCity,
      additionalInfo: Math.random() > 0.5 ? faker.lorem.sentence() : "",
    });

    if (status !== "pending") Order.update(order.id, { status });

    console.log(`📦 ${orderId} | ${fromCity} → ${toCity} | ${status}`);

    if (["pending", "accepted"].includes(status)) {
      const numBids = randomInt(1, 4);
      const shuffled = [...logisticsCompanies].sort(() => Math.random() - 0.5);

      for (let b = 0; b < numBids; b++) {
        const logComp = shuffled[b % shuffled.length];
        const isAccepted = status === "accepted" && assignedLogistics?.id === logComp.id;

        PriceOffer.create({
          orderId: order.id,
          logisticsId: logComp.id,
          proposedPrice: randomInt(4000, 90000),
          estimatedDeliveryDays: randomInt(1, 10),
          note: Math.random() > 0.4 ? faker.lorem.sentence() : "",
          status: isAccepted ? "accepted" : status === "accepted" ? "rejected" : "pending",
        });
      }
      console.log(`   └─ ${numBids} bid(s)`);
    }
  }

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────────────");
  console.log("Test accounts — password for all: Password@123");
  console.log("  👑  admin@routeflow.com");
  console.log("  👷  manufacturer1@routeflow.com  →  manufacturer5@routeflow.com");
  console.log("  🚛  logistics1@routeflow.com     →  logistics5@routeflow.com");
  console.log("─────────────────────────────────────────────");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
