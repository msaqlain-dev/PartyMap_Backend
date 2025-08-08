export const sendResponse = (
  res,
  { success = true, status = 200, message = "", data = null, error = null }
) => {
  res.status(status).json({ success, status, message, data, error });
};
