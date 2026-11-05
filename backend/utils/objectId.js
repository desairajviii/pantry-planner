// Shared id parsing for routes that take an ObjectId from params or body
import { ObjectId } from "mongodb";

// Convert a string to an ObjectId, or null if it isn't a 24-char hex id
// id = req.params.id or an id field from req.body
export function toObjectId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id) // reject non-strings and malformed ids
    ? new ObjectId(id)
    : null;
}
