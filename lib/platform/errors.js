/**
 * Expected, user-facing failures. `code` is stable and machine-readable; `detail` is optional
 * context (for example the item name) and is never shown to users unless a caller chooses to.
 */
export class PlatformError extends Error {
  constructor(code, status = 400, detail) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "PlatformError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}
