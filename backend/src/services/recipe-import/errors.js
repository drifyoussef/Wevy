// Error carrying an HTTP status and a message that can be shown to the user as is (in French).
class ImportError extends Error {
  constructor(status, message, cause) {
    super(message);
    this.name = 'ImportError';
    this.status = status;
    if (cause) this.cause = cause;
  }
}

module.exports = { ImportError };
