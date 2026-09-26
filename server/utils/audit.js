const AuditLog = require("../models/AuditLog");

/**
 * Filter out sensitive fields to protect user privacy and credentials
 */
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== "object") return {};
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "jwt",
    "auth",
    "credential",
    "cvv",
    "creditcard",
    "cardnumber",
    "api_key",
    "apikey"
  ];
  const sanitized = {};

  for (const [key, value] of Object.entries(meta)) {
    const isSensitive = sensitiveKeys.some((s) => key.toLowerCase().includes(s));
    if (!isSensitive) {
      if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          item && typeof item === "object" ? sanitizeMetadata(item) : item
        );
      } else if (value && typeof value === "object") {
        sanitized[key] = sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Safely create and persist an AuditLog entry.
 * Guarantee: Never throws. Audit failures must not break the primary business operation.
 */
async function logAudit({
  action,
  actorId = "system",
  actorEmail = "",
  actorRole = "",
  targetType,
  targetId,
  description,
  metadata = {}
}) {
  try {
    const entry = new AuditLog({
      action,
      actorId: String(actorId || "system"),
      actorEmail: String(actorEmail || ""),
      actorRole: String(actorRole || ""),
      targetType,
      targetId: String(targetId || ""),
      description,
      metadata: sanitizeMetadata(metadata),
      createdAt: new Date()
    });

    await entry.save();
    return entry;
  } catch (error) {
    console.error("Non-fatal AuditLog recording failure:", error.message || error);
    return null;
  }
}

module.exports = {
  logAudit,
  sanitizeMetadata
};
