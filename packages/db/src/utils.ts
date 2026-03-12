/**
 * Generate a 24-character random ID using the Web Crypto API.
 * No external dependencies required.
 */
export function createId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}
