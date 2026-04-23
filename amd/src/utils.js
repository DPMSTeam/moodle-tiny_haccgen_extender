// amd/src/utils.js
/**
 * Convert unknown error/value into a readable string for Moodle alerts.
 *
 * @param {*} x
 * @returns {string}
 */
export const toAlertText = (x) => {
    if (x === null || x === undefined) {
      return '';
    }
    if (typeof x === 'string') {
      return x;
    }
    if (x instanceof Error) {
      return x.message || String(x);
    }
    if (typeof x === 'object') {
      if (x.message) {
        return String(x.message);
      }
      if (x.error) {
        return String(x.error);
      }
      if (x.exception) {
        return String(x.exception);
      }
      try {
        return JSON.stringify(x, null, 2);
      } catch (e) {
        return String(x);
      }
    }
    return String(x);
  };