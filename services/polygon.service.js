export const validatePolygonGeometry = (geometry) => {
  if (!geometry || !geometry.outerRing) {
    return { isValid: false, error: "Geometry must have an outerRing" };
  }

  const { outerRing, holes = [] } = geometry;

  // Validate outer ring
  const outerValidation = validateRing(outerRing.coordinates, "Outer ring");
  if (!outerValidation.isValid) {
    return outerValidation;
  }

  // Validate holes
  for (let i = 0; i < holes.length; i++) {
    const holeValidation = validateRing(holes[i].coordinates, `Hole ${i + 1}`);
    if (!holeValidation.isValid) {
      return holeValidation;
    }
  }

  return { isValid: true };
};

const validateRing = (coordinates, ringName) => {
  if (!Array.isArray(coordinates) || coordinates.length < 4) {
    return {
      isValid: false,
      error: `${ringName} must have at least 4 coordinates`,
    };
  }

  // Check if polygon is closed
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (
    !first ||
    !last ||
    first.longitude !== last.longitude ||
    first.latitude !== last.latitude
  ) {
    return {
      isValid: false,
      error: `${ringName} must be closed (first and last coordinates must be the same)`,
    };
  }

  // Validate coordinate format
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    if (
      !coord ||
      typeof coord.longitude !== "number" ||
      typeof coord.latitude !== "number"
    ) {
      return {
        isValid: false,
        error: `${ringName} coordinate ${i} must have valid longitude and latitude numbers`,
      };
    }

    // Check coordinate bounds
    if (coord.longitude < -180 || coord.longitude > 180) {
      return {
        isValid: false,
        error: `${ringName} coordinate ${i} longitude must be between -180 and 180`,
      };
    }

    if (coord.latitude < -90 || coord.latitude > 90) {
      return {
        isValid: false,
        error: `${ringName} coordinate ${i} latitude must be between -90 and 90`,
      };
    }
  }

  return { isValid: true };
};

export const calculatePolygonArea = (coordinates) => {
  // Simple area calculation using shoelace formula
  let area = 0;
  const n = coordinates.length - 1; // Exclude last coordinate (same as first)

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coordinates[i].longitude * coordinates[j].latitude;
    area -= coordinates[j].longitude * coordinates[i].latitude;
  }

  return Math.abs(area) / 2;
};

export const simplifyPolygon = (coordinates, tolerance = 0.0001) => {
  // Douglas-Peucker algorithm implementation for polygon simplification
  if (coordinates.length <= 3) return coordinates;

  // Keep first and last coordinates (they should be the same for closed polygon)
  const simplified = [coordinates[0]];

  const simplifySegment = (start, end) => {
    let maxDistance = 0;
    let maxIndex = 0;

    for (let i = start + 1; i < end; i++) {
      const distance = perpendicularDistance(
        coordinates[i],
        coordinates[start],
        coordinates[end]
      );
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      simplifySegment(start, maxIndex);
      simplified.push(coordinates[maxIndex]);
      simplifySegment(maxIndex, end);
    }
  };

  simplifySegment(0, coordinates.length - 1);
  simplified.push(coordinates[coordinates.length - 1]); // Ensure polygon is closed

  return simplified;
};

const perpendicularDistance = (point, lineStart, lineEnd) => {
  const A = point.longitude - lineStart.longitude;
  const B = point.latitude - lineStart.latitude;
  const C = lineEnd.longitude - lineStart.longitude;
  const D = lineEnd.latitude - lineStart.latitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.sqrt(A * A + B * B);

  const param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = lineStart.longitude;
    yy = lineStart.latitude;
  } else if (param > 1) {
    xx = lineEnd.longitude;
    yy = lineEnd.latitude;
  } else {
    xx = lineStart.longitude + param * C;
    yy = lineStart.latitude + param * D;
  }

  const dx = point.longitude - xx;
  const dy = point.latitude - yy;

  return Math.sqrt(dx * dx + dy * dy);
};
