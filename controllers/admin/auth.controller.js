import jwt from "jsonwebtoken";
import Admin from "../../models/admin.model.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

// Register a new admin
const registerAdmin = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if admin already exists
  let admin = await Admin.findOne({ email });
  if (admin) {
    return res.status(400).json({ message: "Admin already exists" });
  }

  // Create a new admin
  admin = new Admin({
    firstName,
    lastName,
    email,
    password,
  });

  await admin.save();

  // Generate JWT token
  const token = jwt.sign(
    { userId: admin._id, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  );

  const adminObj = admin.toObject();
  delete adminObj.password;
  delete adminObj.__v;

  res.status(201).json({ token, admin: adminObj });
});

// Login for both users and admins
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const admin = await Admin.findOne({ email });

  // Check if admin exists
  if (!admin) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Compare password
  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Generate JWT token
  const token = jwt.sign({ userId: admin._id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });

  const adminObj = admin.toObject();
  delete adminObj.password;
  delete adminObj.__v;

  res.status(200).json({ token, user: adminObj });
});

export { registerAdmin, login };
