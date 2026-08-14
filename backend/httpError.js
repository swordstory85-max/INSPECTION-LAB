/**
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error & { statusCode: number }}
 */
function httpError(message, statusCode) {
  const error = /** @type {Error & { statusCode: number }} */ (new Error(message));
  error.statusCode = statusCode;
  return error;
}

module.exports = { httpError };
