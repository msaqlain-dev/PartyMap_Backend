import User from "../../models/user.model.js";
import { asyncHandler } from "../../utils/index.js";

// Get current user or admin
const getUserInfo = asyncHandler(async (req, res) => {
  const user = await User.findById(req.id).select("-password");

  res.status(200).json(user);
});

export { getUserInfo };
