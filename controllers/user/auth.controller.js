import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";
import { asyncHandler } from "../../utils/index.js";

// Register a new user
const registerUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    addressLine1,
    city,
    state,
    zipCode,
    phone,
    instagram,
    facebook,
    twitter,
    snap,
  } = req.body;

  console.log("Register Data: " + req.body);

  // Check if user already exists
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Create a new user
  user = new User({
    firstName,
    lastName,
    email,
    password,
    address: {
      addressLine1: addressLine1 || "",
      city: city || "",
      state: state || "",
      zipCode: zipCode || "",
      country: "USA",
    },
    phone: phone || "",
    instagram: instagram || "",
    facebook: facebook || "",
    twitter: twitter || "",
    snap: snap || "",
  });

  await user.save();

  // Generate JWT token
  const token = jwt.sign(
    { id: user._id, email, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  );

  res.status(201).json({ token, user });
});

// Login for both users and admins
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  console.log("Login Data: " + req.body);

  const user = await User.findOne({ email });

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
  const token = jwt.sign(
    { id: user._id, email, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY,
    }
  );

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;

  res.status(200).json({ token, user: userObj });
});

// Get current user or admin
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.id).select("-password");

  res.status(200).json(user);
});

export { registerUser, login, getCurrentUser };
