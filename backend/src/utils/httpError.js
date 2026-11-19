// An error that carries an HTTP status code. The error handler turns it into JSON.
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = HttpError;
