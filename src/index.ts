import dns from "dns";
const range = require("node-range");

var isValidEmail = /^(?!(?:(?:\x22?\x5C[\x00-\x7E]\x22?)|(?:\x22?[^\x5C\x22]\x22?)){255,})(?!(?:(?:\x22?\x5C[\x00-\x7E]\x22?)|(?:\x22?[^\x5C\x22]\x22?)){65,}@)(?:(?:[\x21\x23-\x27\x2A\x2B\x2D\x2F-\x39\x3D\x3F\x5E-\x7E]+)|(?:\x22(?:[\x01-\x08\x0B\x0C\x0E-\x1F\x21\x23-\x5B\x5D-\x7F]|(?:\x5C[\x00-\x7F]))*\x22))(?:\.(?:(?:[\x21\x23-\x27\x2A\x2B\x2D\x2F-\x39\x3D\x3F\x5E-\x7E]+)|(?:\x22(?:[\x01-\x08\x0B\x0C\x0E-\x1F\x21\x23-\x5B\x5D-\x7F]|(?:\x5C[\x00-\x7F]))*\x22)))*@(?:(?:(?!.*[^.]{64,})(?:(?:(?:xn--)?[a-z0-9]+(?:-[a-z0-9]+)*\.){1,126}){1,}(?:(?:[a-z][a-z0-9]*)|(?:(?:xn--)[a-z0-9]+))(?:-[a-z0-9]+)*)|(?:\[(?:(?:IPv6:(?:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){7})|(?:(?!(?:.*[a-f0-9][:\]]){7,})(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,5})?::(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,5})?)))|(?:(?:IPv6:(?:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){5}:)|(?:(?!(?:.*[a-f0-9]:){5,})(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,3})?::(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,3}:)?)))?(?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9]{2})|(?:[1-9]?[0-9]))(?:\.(?:(?:25[0-5])|(?:2[0-4][0-9])|(?:1[0-9]{2})|(?:[1-9]?[0-9]))){3}))\]))$/;

/**
 * Usage
 * var { isEmailValid } = require('email-validator-node')
 * await isEmailValid(String email);
 *
 * @param {String} email - The possible email input
 * @return {validateEmailResponse} true is the specified email is valid, false otherwise
 */
async function checkEmail(email: string): Promise<validateEmailResponse> {
  const isFormatValid = await isEmailFormatValid(email);

  if (!isFormatValid) {
    return { isValid: false, message: "invalid-format" };
  }

  if (isBlacklisted(email)) {
    return { isValid: false, message: "blacklist" };
  }

  return await isMXRecordValid(email);
}

/**
 * Usage
 * var { isEmailFormatValid } = require('email-validator-node')
 * await isEmailFormatValid(String email);
 *
 * @param {String} email - The possible email input
 * @return {Boolean}
 */
async function isEmailFormatValid(email: string): Promise<boolean> {
  if (!email) return false;
  if (!email.length) return false;
  if (typeof email !== "string") return false;
  if (email && !isValidEmail.test(email.toLowerCase())) return false;
  return true;
}

function domainSuffixes(email: string) {
  var domainComponents = email.split("@")[1].split(".");
  return range(0, domainComponents.length).map((n: any) =>
    domainComponents.slice(n).join(".")
  );
}

/**
 * Usage
 * var { isBlacklisted } = require('email-validator-node')
 * await isBlacklisted(String email);
 *
 * @param {String} email - The possible email input
 * @return {Boolean}
 */
function isBlacklisted(email: string): boolean {
  const blacklist = require("./blacklist.js")

  function suffixIsBlacklisted(domainSuffix: any) {
    return blacklist[domainSuffix];
  }
  return domainSuffixes(email).some(suffixIsBlacklisted);
}

/**
 * Success/Error return object
 * @typedef validateEmailResponse
 * @property {boolean} [isValid] - Success
 * @property {string} [message] - Error message
 * @property {array} [mxRecords] - MX Records
 */

type validateEmailResponse = Promise<object>

/**
 * Usage
 * var { isMXRecordValid } = require('email-validator-node')
 * await isMXRecordValid(String email);
 *
 * @param {String} email - The possible email input
 * @return {validateEmailResponse} true is the specified email is valid, false otherwise
 */
async function isMXRecordValid(email: string): Promise<validateEmailResponse> {
  const [account, domain] = email.split("@");
  return new Promise((resolve, reject) => {
    try {
      dns.resolveMx(domain, (err: any, mx: any) => {
        if (typeof mx != "undefined") {
          mx && mx.length
            ? resolve({ isValid: true, mxRecords: mx })
            : resolve({ isValid: false, mxRecords: null });
        } else if (err.code == "ENOTFOUND" || err.code == "ENODATA") {
          resolve({ isValid: false, mxRecords: null, message: "not-found" });
        } else {
          resolve({ isValid: false, mxRecords: null, message: "error" });
        }
      });
    } catch (error: any) {
      resolve({ isValid: false, mxRecords: null, message: error.message });
    }
  });
}


module.exports = {
  checkEmail,
  isEmailFormatValid,
  isMXRecordValid,
  isBlacklisted,
};
