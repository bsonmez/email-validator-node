// Test fixture with known blacklisted domains for reliable testing
export const testBlacklistedDomains: readonly string[] = Object.freeze([
  '0-00.usa.cc',
  '10minutemail.com',
  'guerrillamail.com',
  'tempmail.org',
  'mailinator.com',
  '33mail.com',
  'dispostable.com',
  'throwaway.email',
  'temp-mail.org'
]);

export const TEST_BLACKLISTED_DOMAINS: ReadonlySet<string> = Object.freeze(
  new Set(testBlacklistedDomains)
);

export const TEST_BLACKLIST_COUNT = testBlacklistedDomains.length;