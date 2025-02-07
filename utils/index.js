const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function escapeRegex(input) {
  return input.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}

const getContentType = (filename) => {
  const extension = filename.split(".").pop().toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    case "xls":
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
};

export { asyncHandler, escapeRegex, sanitizeEmail, getContentType };
