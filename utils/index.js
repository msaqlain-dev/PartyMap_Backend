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

const formatTickets = (tickets, markerId = null) => {
  if (!tickets) return [];
  return tickets
    .map((availableTickets, index) => {
      if (availableTickets) {
        const hour = index;
        const period = hour < 12 ? "AM" : "PM";
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
        return {
          hour: `${formattedHour}:00 ${period}`,
          availableTickets: parseInt(availableTickets, 10),
          ...(markerId && { marker: markerId }),
        };
      }
      return null;
    })
    .filter(Boolean);
};

export {
  escapeRegex,
  sanitizeEmail,
  getContentType,
  formatTickets,
};
