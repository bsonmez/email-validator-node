import * as dns from "dns";
import { BLACKLISTED_DOMAINS } from "./blacklist";

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
  const isFormatValid = isEmailFormatValid(email);

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
function isEmailFormatValid(email: string): boolean {
  if (!email) return false;
  if (!email.length) return false;
  if (typeof email !== "string") return false;
  if (email && !isValidEmail.test(email.toLowerCase())) return false;
  return true;
}

function domainSuffixes(email: string): string[] {
  const domainComponents = email.split("@")[1].split(".");
  return Array.from({ length: domainComponents.length }, (_, n) =>
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
  return domainSuffixes(email).some(domainSuffix => 
    BLACKLISTED_DOMAINS.has(domainSuffix)
  );
}

/**
 * MX Record interface
 */
export interface MxRecord {
  priority: number;
  exchange: string;
}

/**
 * Validation check results interface
 */
export interface ValidationChecks {
  format: boolean;
  blacklist: boolean;
  dns: boolean;
}

/**
 * Email validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  email?: string;
  checks?: ValidationChecks;
  mxRecords?: MxRecord[];
  message?: string;
}

/**
 * Validation options interface
 */
export interface ValidationOptions {
  skipBlacklist?: boolean;
  skipDNS?: boolean;
  timeout?: number;
  cache?: boolean;
}

type validateEmailResponse = ValidationResult;

/**
 * Usage
 * var { isMXRecordValid } = require('email-validator-node')
 * await isMXRecordValid(String email);
 *
 * @param {String} email - The possible email input
 * @return {validateEmailResponse} true is the specified email is valid, false otherwise
 */
async function isMXRecordValid(email: string, timeout: number = 3000): Promise<ValidationResult> {
  const [account, domain] = email.split("@");
  
  return new Promise((resolve) => {
    let isResolved = false;
    
    // Set timeout to avoid hanging DNS queries
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve({ 
          isValid: false, 
          mxRecords: undefined, 
          message: "timeout" 
        });
      }
    }, timeout);
    
    try {
      dns.resolveMx(domain, (err: NodeJS.ErrnoException | null, mx: MxRecord[]) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);
        
        if (mx && typeof mx !== "undefined") {
          // Check for null MX record (exchange is empty or just a dot)
          const hasNullMx = mx.length > 0 && 
            mx.some((record: MxRecord) => !record.exchange || record.exchange === '.' || record.exchange === '');

          if (hasNullMx) {
            resolve({ isValid: false, mxRecords: mx, message: "null-mx" });
          } else if (mx.length > 0) {
            resolve({ isValid: true, mxRecords: mx });
          } else {
            resolve({ isValid: false, mxRecords: undefined, message: "no-mx" });
          }
        } else if (err?.code === "ENOTFOUND" || err?.code === "ENODATA" || err?.code === 'SERVFAIL') {
          resolve({ isValid: false, mxRecords: undefined, message: "not-found" });
        } else {
          resolve({ isValid: false, mxRecords: undefined, message: err?.message || "error" });
        }
      });
    } catch (error: any) {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutId);
      resolve({ isValid: false, mxRecords: undefined, message: error.message });
    }
  });
}


/**
 * Batch email validation with parallel processing
 * @param emails Array of email addresses to validate
 * @param concurrency Maximum concurrent DNS queries (default: 5)
 * @returns Promise<ValidationResult[]>
 */
async function checkEmails(emails: string[], concurrency: number = 5): Promise<ValidationResult[]> {
  const uniqueDomains = new Map<string, string[]>();
  
  // Group emails by domain to optimize DNS queries
  emails.forEach((email) => {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain) {
      if (!uniqueDomains.has(domain)) {
        uniqueDomains.set(domain, []);
      }
      uniqueDomains.get(domain)!.push(email);
    }
  });
  
  // Process domains in batches
  const domainEntries = Array.from(uniqueDomains.entries());
  const batches = [];
  for (let i = 0; i < domainEntries.length; i += concurrency) {
    batches.push(domainEntries.slice(i, i + concurrency));
  }
  
  const domainResults = new Map<string, ValidationResult>();
  
  for (const batch of batches) {
    const promises = batch.map(async ([domain, domainEmails]) => {
      const sampleEmail = domainEmails[0];
      const result = await checkEmail(sampleEmail);
      domainResults.set(domain, result);
    });
    
    await Promise.all(promises);
  }
  
  // Map results back to original email order
  return emails.map(email => {
    const domain = email.split("@")[1]?.toLowerCase();
    const baseResult = domainResults.get(domain!) || { isValid: false, message: "invalid-format" };
    
    return {
      ...baseResult,
      email
    };
  });
}

// Export both CommonJS and ES modules
export {
  checkEmail,
  checkEmails,
  isEmailFormatValid,
  isMXRecordValid,
  isBlacklisted,
};

module.exports = {
  checkEmail,
  checkEmails,
  isEmailFormatValid,
  isMXRecordValid,
  isBlacklisted,
};
