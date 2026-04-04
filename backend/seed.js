// seed.js — Run with: node seed.js
// Seeds: 1 admin, 5 manufacturers, 5 logistics companies, 20 orders, bids

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/userModel.js";
import Order from "./models/orderModel.js";
import PriceOffer from "./models/priceOfferModel.js";

// ── Nepal-specific data ───────────────────────────────────────────────────────

const NEPAL_CITIES = [
  "Kathmandu",
  "Pokhara",
  "Lalitpur",
  "Bhaktapur",
  "Biratnagar",
  "Birgunj",
  "Dharan",
  "Janakpur",
  "Hetauda",
  "Nepalgunj",
  "Butwal",
  "Dhangadhi",
  "Itahari",
  "Bharatpur",
  "Gorkha",
];

const VEHICLE_TYPES = [
  "motorcycle",
  "small_van",
  "large_van",
  "truck",
  "large_truck",
];

const PRODUCT_TYPES = [
  "Cotton fabric rolls",
  "Electronics components",
  "Handicraft items",
  "Pharmaceutical supplies",
  "Construction materials",
  "Food grains",
  "Garment products",
  "Industrial machinery parts",
  "Furniture",
  "Agricultural produce",
  "Spices and herbs",
  "Ceramic products",
  "Paper and stationery",
  "Plastic goods",
  "Metal sheets",
];

const MFG_SUFFIXES = [
  "Industries Pvt. Ltd.",
  "Manufacturing Co.",
  "Exports Pvt. Ltd.",
  "Products Ltd.",
  "Enterprises",
  "Works Pvt. Ltd.",
];

const LOG_SUFFIXES = [
  "Logistics Pvt. Ltd.",
  "Transport Co.",
  "Cargo Services",
  "Freight Solutions",
  "Express Delivery",
  "Movers Pvt. Ltd.",
];

const ORDER_STATUSES = [
  "pending",
  "accepted",
  "in transit",
  "delivered",
  "cancelled",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateOrderId() {
  return "ORD-" + Date.now() + "-" + randomInt(1000, 9999);
}

function nepaliCompanyName(suffixes) {
  return `${faker.person.lastName()} ${randomFrom(suffixes)}`;
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

// ── Main seed ─────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected\n");

  // Clear existing non-admin data
  await User.deleteMany({ role: { $ne: "admin" } });
  await Order.deleteMany({});
  await PriceOffer.deleteMany({});
  console.log("🗑️  Cleared existing seed data\n");

  const password = await hashPassword("Password@123");

  // ── Admin ─────────────────────────────────────────────────────────────────
  await User.deleteMany({ role: "admin" }); // remove old admin if any
  await User.create({
    companyName: "RouteFlow Admin",
    role: "admin",
    email: "admin@routeflow.com",
    password,
    contactNumber: "9800000000",
    companyLocation: "Kathmandu",
    companyDescription: "Platform administrator",
    isVerified: true,
    isAccountVerified: true,
    submittedForVerification: true,
  });
  console.log("👑 Admin: admin@routeflow.com");

  // ── Manufacturers ─────────────────────────────────────────────────────────
  const manufacturers = [];
  for (let i = 0; i < 5; i++) {
    const user = await User.create({
      companyName: nepaliCompanyName(MFG_SUFFIXES),
      role: "manufacturer",
      email: `manufacturer${i + 1}@routeflow.com`,
      password,
      contactNumber: `98${randomInt(10000000, 99999999)}`,
      panNo: `${randomInt(100000000, 999999999)}`,
      companyLocation: randomFrom(NEPAL_CITIES),
      companyDescription: faker.company.catchPhrase(),
      isVerified: true,
      isAccountVerified: true,
      submittedForVerification: true,
    });
    manufacturers.push(user);
    console.log(`👷 Manufacturer: ${user.companyName} (${user.email})`);
  }

  // ── Logistics companies ───────────────────────────────────────────────────
  const logisticsCompanies = [];
  for (let i = 0; i < 5; i++) {
    const user = await User.create({
      companyName: nepaliCompanyName(LOG_SUFFIXES),
      role: "logistics",
      email: `logistics${i + 1}@routeflow.com`,
      password,
      contactNumber: `98${randomInt(10000000, 99999999)}`,
      panNo: `${randomInt(100000000, 999999999)}`,
      companyLocation: randomFrom(NEPAL_CITIES),
      companyDescription: faker.company.catchPhrase(),
      isVerified: true,
      isAccountVerified: true,
      submittedForVerification: true,
    });
    logisticsCompanies.push(user);
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

    const assignedLogistics = ["accepted", "in transit", "delivered"].includes(
      status,
    )
      ? randomFrom(logisticsCompanies)
      : null;

    const order = await Order.create({
      orderId,
      manufacturer: manufacturer._id,
      logistics: assignedLogistics?._id ?? null,
      productDetails: randomFrom(PRODUCT_TYPES),
      quantity: randomInt(10, 500),
      weight: randomInt(5, 2000),
      vehicleType: randomFrom(VEHICLE_TYPES),
      invoiceNeeded: faker.datatype.boolean(),
      vatBillNeeded: faker.datatype.boolean(),
      expectedPrice: randomInt(5000, 80000),
      status,
      routeFrom: fromCity,
      routeTo: toCity,
      additionalInfo: Math.random() > 0.5 ? faker.lorem.sentence() : undefined,
      createdAt: faker.date.between({ from: "2024-09-01", to: new Date() }),
    });

    console.log(`📦 ${orderId} | ${fromCity} → ${toCity} | ${status}`);

    // Create bids for pending and accepted orders
    if (["pending", "accepted"].includes(status)) {
      const numBids = randomInt(1, 4);
      const shuffled = [...logisticsCompanies].sort(() => Math.random() - 0.5);

      for (let b = 0; b < numBids; b++) {
        const logComp = shuffled[b % shuffled.length];
        const isAccepted =
          status === "accepted" &&
          assignedLogistics?._id.toString() === logComp._id.toString();

        await PriceOffer.create({
          orderId, // ← string orderId required by your schema
          order: order._id,
          logistics: logComp._id,
          proposedPrice: randomInt(4000, 90000),
          estimatedDeliveryDays: randomInt(1, 10),
          note: Math.random() > 0.4 ? faker.lorem.sentence() : "",
          status: isAccepted
            ? "accepted"
            : status === "accepted"
              ? "rejected"
              : "pending",
          createdAt: faker.date.between({
            from: order.createdAt,
            to: new Date(),
          }),
        });
      }
      console.log(`   └─ ${numBids} bid(s)`);
    }
  }

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────────────────");
  console.log("Test accounts — password for all: Password@123");
  console.log("  👑  admin@routeflow.com");
  console.log(
    "  👷  manufacturer1@routeflow.com  →  manufacturer5@routeflow.com",
  );
  console.log("  🚛  logistics1@routeflow.com     →  logistics5@routeflow.com");
  console.log("─────────────────────────────────────────────");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
