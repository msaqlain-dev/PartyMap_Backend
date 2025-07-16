import jwt from "jsonwebtoken";
import Admin from "../../models/admin.model.js";
import { asyncHandler } from "../../utils/index.js";

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

  res.status(201).json({ token, admin });
});

// Login for both users and admins
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  const user = await Admin.findOne({ email });

  // Check if user exists
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });

  res.status(200).json({ token, user });
});

export { registerAdmin, login };
