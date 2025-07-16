import jwt from "jsonwebtoken";
import Admin from "../../models/admin.model.js";

export const authenticateAdmin = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user is an admin
    const admin = await Admin.findById(decoded.userId);
    if (!admin || decoded.role !== "admin") {
      return res
        .status(403)
        .json({
          message: "Access denied. You are not authorized as an admin.",
        });
    }

    // Attach the admin and role to the request object
    req.admin = admin;
    req.role = decoded.role;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
};
