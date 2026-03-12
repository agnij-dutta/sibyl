// ---------------------------------------------------------------------------
// Error Fingerprinting
// ---------------------------------------------------------------------------
// Generates stable, deterministic fingerprints for error events so that
// identical (or near-identical) errors are grouped into a single incident.
//
// The algorithm:
//   1. Normalize the error message (strip dynamic values like UUIDs, hex
//      addresses, numbers, and filesystem paths).
//   2. If a stack trace is present, normalize the top 5 frames (strip
//      line/column numbers) and append them to the key.
//   3. Hash the resulting string to produce a compact fingerprint.
// ---------------------------------------------------------------------------

/**
 * Compute a stable fingerprint for an error message + optional stack trace.
 *
 * @param message - The raw error message string.
 * @param stack   - Optional stack trace (newline-delimited frames).
 * @returns An 8-character base-36 fingerprint string.
 */
export function fingerprint(message: string, stack?: string): string {
  const normalized = normalizeMessage(message);
  const key = stack ? `${normalized}:${normalizeStack(stack)}` : normalized;
  return hashString(key);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip dynamic values from an error message so structurally identical
 * errors produce the same normalized form.
 */
function normalizeMessage(msg: string): string {
  return msg
    // UUIDs (v4 and similar) — must run before number replacement
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '<uuid>',
    )
    // Hexadecimal addresses (0x1a2b3c)
    .replace(/0x[0-9a-fA-F]+/g, '<hex>')
    // Standalone numbers
    .replace(/\b\d+\b/g, '<num>')
    // File-system-style paths (/foo/bar)
    .replace(/\/[^\s/]+\/[^\s/]+/g, '<path>')
    .trim();
}

/**
 * Normalize a stack trace by taking the top 5 frames, stripping line and
 * column numbers, and joining them with a pipe delimiter.
 */
function normalizeStack(stack: string): string {
  const lines = stack.split('\n').slice(0, 5);
  return lines
    .map((line) => line.replace(/:\d+:\d+/g, '').trim())
    .join('|');
}

/**
 * Simple, fast, non-cryptographic string hash.
 * Returns an 8-character zero-padded base-36 string.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}
