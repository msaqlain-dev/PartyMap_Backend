import { asyncHandler } from "../../middleware/asyncHandler.js";
import Admin from "../../models/admin.model.js";

// Get current user or admin
const getAdminInfo = asyncHandler(async (req, res) => {
  let user = await Admin.findById(req.userId).select("-password");

  res.status(200).json(user);
});

export { getAdminInfo };
