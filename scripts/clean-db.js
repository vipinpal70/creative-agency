const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 1. Resolve and parse .env manually
const envPath = path.join(__dirname, "..", ".env");
let mongodbUri = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^MONGODB_URI\s*=\s*(.+)$/m);
  if (match) {
    mongodbUri = match[1].trim();
  }
}

if (!mongodbUri) {
  console.error("Error: MONGODB_URI not found in .env file.");
  process.exit(1);
}

// Ensure local storage folders exist or recreate them empty
function clearDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Clearing directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(mongodbUri);
    console.log("Connected to MongoDB.");

    // 2. Clear all database collections using raw db listCollections to capture all of them
    console.log("Retrieving collections...");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections. Clearing documents...`);
    for (const col of collections) {
      const name = col.name;
      if (name.startsWith("system.")) continue;
      console.log(`  - Deleting all documents in collection: ${name}`);
      await mongoose.connection.db.collection(name).deleteMany({});
    }

    // 3. Clear file system uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const repoStorageDir = path.join(process.cwd(), "storage", "repository");

    clearDirectory(uploadsDir);
    clearDirectory(repoStorageDir);
    console.log("Files and folder storage cleared successfully.");

    // 4. Seed default administrator user
    console.log("Seeding default admin user...");
    const adminEmail = "admin@creativeagency.com";
    const adminPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await mongoose.connection.collection("users").insertOne({
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      status: "active",
      type: "internal",
      roles: ["ADMIN"],
      avatarColor: "#16A34A",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("\n=============================================");
    console.log("Database and storage successfully cleaned!");
    console.log("=============================================");
    console.log("Default Admin Credentials:");
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log("=============================================\n");

  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
