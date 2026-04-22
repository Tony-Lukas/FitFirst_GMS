export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

export function isBooleanLike(value) {
  return typeof value === "boolean" || value === "true" || value === "false";
}

export function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
}
