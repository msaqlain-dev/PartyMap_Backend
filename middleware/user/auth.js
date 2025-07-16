import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";

export const authenticateUser = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user is a regular user
    const user = await User.findById(decoded.userId);
    if (!user || decoded.role !== "user") {
      return res
        .status(403)
        .json({ message: "Access denied. You are not authorized as a user." });
    }

    // Attach the user and role to the request object
    req.user = user;
    req.role = decoded.role;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
};
