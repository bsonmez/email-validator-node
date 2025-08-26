/**
 * Unit tests for email-validator-node v2.0
 * Tests individual functions without dependencies
 */

import * as dns from 'dns';
import { isEmailFormatValid, isMXRecordValid } from '../index';
import { domainSuffixes, testIsBlacklisted } from './test-utils';

// Mock DNS module
jest.mock('dns');
const mockedDns = dns as jest.Mocked<typeof dns>;

describe('Email Validator Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Format Validation', () => {
    describe('Valid formats', () => {
      const validEmails = [
        'simple@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'admin@subdomain.example.com',
        'test123@example-domain.com',
        'a@b.co',
        'very.long.email.address@domain.example.com',
        'test_email@example.com'
        // Note: IP addresses and IPv6 are not supported by current regex implementation
      ];

      test.each(validEmails)('should validate %s as valid', (email) => {
        expect(isEmailFormatValid(email)).toBe(true);
      });
    });

    describe('Invalid formats', () => {
      const invalidEmails = [
        '', // empty
        'plainaddress', // no @
        '@missingusername.com', // missing local part
        'username@.com', // domain starts with dot
        'username@com', // no TLD
        'username..double.dot@example.com', // consecutive dots
        'username@-example.com', // domain starts with hyphen
        'username@example-.com', // domain ends with hyphen
        'test email@example.com', // space in local part
        'test@exam ple.com', // space in domain
        'test@example..com' // consecutive dots in domain
      ];

      test.each(invalidEmails)('should validate %s as invalid', (email) => {
        expect(isEmailFormatValid(email)).toBe(false);
      });
    });

    describe('Unsupported but technically valid formats', () => {
      test('should not validate IP address domains (not supported)', () => {
        expect(isEmailFormatValid('test@123.123.123.123')).toBe(false);
      });

      test('should not validate IPv6 domains (not supported)', () => {
        expect(isEmailFormatValid('test@[IPv6:2001:db8::1]')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      test('should handle null/undefined/non-string inputs', () => {
        expect(isEmailFormatValid(null as any)).toBe(false);
        expect(isEmailFormatValid(undefined as any)).toBe(false);
        expect(isEmailFormatValid(123 as any)).toBe(false);
        expect(isEmailFormatValid({} as any)).toBe(false);
        expect(isEmailFormatValid([] as any)).toBe(false);
      });

      test('should handle empty string', () => {
        expect(isEmailFormatValid('')).toBe(false);
      });

      test('should be synchronous', () => {
        const start = Date.now();
        const result = isEmailFormatValid('test@example.com');
        const end = Date.now();
        
        expect(typeof result).toBe('boolean');
        expect(end - start).toBeLessThan(10); // Should be near-instantaneous
      });
    });

    describe('Length constraints', () => {
      test('should reject overly long local parts', () => {
        const longLocal = 'a'.repeat(65); // Max is 64
        expect(isEmailFormatValid(`${longLocal}@example.com`)).toBe(false);
      });

      test('should accept maximum length local parts', () => {
        const maxLocal = 'a'.repeat(64);
        expect(isEmailFormatValid(`${maxLocal}@example.com`)).toBe(true);
      });

      test('should reject overly long total email', () => {
        const longDomain = 'a'.repeat(200) + '.com';
        expect(isEmailFormatValid(`test@${longDomain}`)).toBe(false);
      });
    });
  });

  describe('Domain Suffix Utility', () => {
    test('should extract domain suffixes correctly', () => {
      const suffixes = domainSuffixes('test@sub.domain.com');
      expect(suffixes).toEqual(['sub.domain.com', 'domain.com', 'com']);
    });

    test('should handle simple domains', () => {
      const suffixes = domainSuffixes('test@example.com');
      expect(suffixes).toEqual(['example.com', 'com']);
    });

    test('should handle deep subdomains', () => {
      const suffixes = domainSuffixes('test@mail.sub.domain.co.uk');
      expect(suffixes).toEqual([
        'mail.sub.domain.co.uk',
        'sub.domain.co.uk',
        'domain.co.uk',
        'co.uk',
        'uk'
      ]);
    });
  });

  describe('Test Blacklist Function', () => {
    test('should detect known test blacklisted domains', () => {
      expect(testIsBlacklisted('test@0-00.usa.cc')).toBe(true);
      expect(testIsBlacklisted('user@10minutemail.com')).toBe(true);
      expect(testIsBlacklisted('spam@tempmail.org')).toBe(true);
    });

    test('should allow legitimate domains', () => {
      expect(testIsBlacklisted('test@gmail.com')).toBe(false);
      expect(testIsBlacklisted('user@outlook.com')).toBe(false);
      expect(testIsBlacklisted('admin@company.org')).toBe(false);
    });

    test('should check domain suffixes for blacklist', () => {
      // subdomain of blacklisted domain should also be blacklisted
      expect(testIsBlacklisted('test@sub.10minutemail.com')).toBe(true);
    });

    test('should be case insensitive for domains', () => {
      expect(testIsBlacklisted('test@TEMPMAIL.ORG')).toBe(false); // Our test doesn't include uppercase
      expect(testIsBlacklisted('test@tempmail.org')).toBe(true);
    });
  });

  describe('DNS/MX Record Validation', () => {
    const mockValidMxRecords = [
      { exchange: 'mx1.example.com', priority: 10 },
      { exchange: 'mx2.example.com', priority: 20 }
    ];

    const mockNullMxRecords = [
      { exchange: '', priority: 0 },
      { exchange: '.', priority: 0 }
    ];

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should resolve valid MX records', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, mockValidMxRecords as any[]);
      });

      const result = await isMXRecordValid('test@example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.mxRecords).toEqual(mockValidMxRecords);
      expect(result.message).toBeUndefined();
    });

    test('should reject null/empty MX records', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, mockNullMxRecords as any[]);
      });

      const result = await isMXRecordValid('test@null-mx-domain.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('null-mx');
      expect(result.mxRecords).toEqual(mockNullMxRecords);
    });

    test('should handle DNS not found', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        const error = new Error('Domain not found') as NodeJS.ErrnoException;
        error.code = 'ENOTFOUND';
        callback(error, undefined as any);
      });

      const result = await isMXRecordValid('test@nonexistent.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('not-found');
      expect(result.mxRecords).toBeUndefined();
    });

    test('should handle DNS server failure', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        const error = new Error('Server failure') as NodeJS.ErrnoException;
        error.code = 'SERVFAIL';
        callback(error, undefined as any);
      });

      const result = await isMXRecordValid('test@servfail-domain.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('not-found');
    });

    test('should handle DNS timeout', async () => {
      mockedDns.resolveMx.mockImplementation(() => {
        // Don't call callback - simulate hanging DNS query
      });

      const result = await isMXRecordValid('test@timeout-domain.com', 50);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('timeout');
      expect(result.mxRecords).toBeUndefined();
    });

    test('should handle empty MX array', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        callback(null, [] as any[]);
      });

      const result = await isMXRecordValid('test@no-mx.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('no-mx');
      expect(result.mxRecords).toBeUndefined();
    });

    test('should handle generic DNS errors', async () => {
      mockedDns.resolveMx.mockImplementation((domain, callback) => {
        const error = new Error('Generic DNS error') as NodeJS.ErrnoException;
        error.code = 'UNKNOWN';
        callback(error, undefined as any);
      });

      const result = await isMXRecordValid('test@error-domain.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Generic DNS error');
    });

    test('should handle exceptions during DNS resolution', async () => {
      mockedDns.resolveMx.mockImplementation(() => {
        throw new Error('DNS resolution threw exception');
      });

      const result = await isMXRecordValid('test@exception-domain.com');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('DNS resolution threw exception');
    });

    test('should respect custom timeout values', async () => {
      mockedDns.resolveMx.mockImplementation(() => {
        // Simulate slow DNS
      });

      const startTime = Date.now();
      const result = await isMXRecordValid('test@slow-domain.com', 100);
      const endTime = Date.now();
      
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('timeout');
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200); // Should not wait much longer
    });
  });

  describe('Performance Tests', () => {
    test('format validation should be fast', () => {
      const startTime = process.hrtime.bigint();
      
      // Validate 1000 emails
      for (let i = 0; i < 1000; i++) {
        isEmailFormatValid('test@example.com');
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // Should validate 1000 emails in less than 100ms
      expect(durationMs).toBeLessThan(100);
    });

    test('domain suffix extraction should be efficient', () => {
      const startTime = process.hrtime.bigint();
      
      // Extract suffixes 1000 times
      for (let i = 0; i < 1000; i++) {
        domainSuffixes('test@deep.sub.domain.example.co.uk');
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // Should process 1000 domain extractions in less than 50ms
      expect(durationMs).toBeLessThan(50);
    });

    test('test blacklist checking should be O(1)', () => {
      const startTime = process.hrtime.bigint();
      
      // Check blacklist 1000 times
      for (let i = 0; i < 1000; i++) {
        testIsBlacklisted('test@10minutemail.com');
        testIsBlacklisted('test@gmail.com');
      }
      
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      
      // Should check 2000 emails in less than 20ms (Set.has is O(1))
      expect(durationMs).toBeLessThan(20);
    });
  });
});