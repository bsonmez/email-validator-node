import { TEST_BLACKLISTED_DOMAINS } from './fixtures/test-blacklist';

// Mock DNS module for predictable testing
export const mockDns = {
  resolveMx: jest.fn()
};

// Test-specific domain suffix function (same logic as main)
export function domainSuffixes(email: string): string[] {
  const domainComponents = email.split("@")[1].split(".");
  return Array.from({ length: domainComponents.length }, (_, n) =>
    domainComponents.slice(n).join(".")
  );
}

// Test-specific blacklist checker using test fixture
export function testIsBlacklisted(email: string): boolean {
  return domainSuffixes(email).some(domainSuffix => 
    TEST_BLACKLISTED_DOMAINS.has(domainSuffix)
  );
}

// Mock MX records for testing
export const mockValidMxRecords = [
  { exchange: 'mx1.example.com', priority: 10 },
  { exchange: 'mx2.example.com', priority: 20 }
];

export const mockNullMxRecords = [
  { exchange: '', priority: 0 },
  { exchange: '.', priority: 0 }
];

// Timeout simulation for DNS tests
export const createTimeoutPromise = (delay: number) => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), delay)
  );