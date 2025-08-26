/**
 * End-to-End tests for email-validator-node v2.0
 * Tests the compiled build functionality
 */

describe('E2E Tests - Production Build', () => {
  // Import from compiled build
  let emailValidator: any;
  
  beforeAll(() => {
    // Import the compiled version
    emailValidator = require('../../lib/index.js');
  });

  describe('Public API', () => {
    test('should export all expected functions', () => {
      expect(typeof emailValidator.isEmailFormatValid).toBe('function');
      expect(typeof emailValidator.checkEmail).toBe('function');
      expect(typeof emailValidator.checkEmails).toBe('function');
      expect(typeof emailValidator.isMXRecordValid).toBe('function');
      expect(typeof emailValidator.isBlacklisted).toBe('function');
    });
  });

  describe('Format Validation - Production Build', () => {
    test('should validate email formats correctly', () => {
      const { isEmailFormatValid } = emailValidator;
      
      // Valid emails
      expect(isEmailFormatValid('test@gmail.com')).toBe(true);
      expect(isEmailFormatValid('user.name@company.co.uk')).toBe(true);
      expect(isEmailFormatValid('admin+tag@subdomain.example.com')).toBe(true);
      
      // Invalid emails
      expect(isEmailFormatValid('invalid.email')).toBe(false);
      expect(isEmailFormatValid('')).toBe(false);
      expect(isEmailFormatValid('test@')).toBe(false);
      expect(isEmailFormatValid('@example.com')).toBe(false);
      expect(isEmailFormatValid(null)).toBe(false);
      expect(isEmailFormatValid(undefined)).toBe(false);
      expect(isEmailFormatValid(123)).toBe(false);
    });

    test('should be synchronous', () => {
      const { isEmailFormatValid } = emailValidator;
      const start = Date.now();
      const result = isEmailFormatValid('test@example.com');
      const end = Date.now();
      
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('Blacklist Validation - Production Build', () => {
    test('should detect blacklisted domains', () => {
      const { isBlacklisted } = emailValidator;
      
      // Test with known blacklisted domains from our blacklist
      expect(isBlacklisted('test@0-00.usa.cc')).toBe(true);
      
      // Test with legitimate domains
      expect(isBlacklisted('test@gmail.com')).toBe(false);
      expect(isBlacklisted('user@outlook.com')).toBe(false);
    });

    test('should handle domain suffixes', () => {
      const { isBlacklisted } = emailValidator;
      
      // Subdomain of blacklisted domain should be caught
      expect(isBlacklisted('test@sub.0-00.usa.cc')).toBe(true);
    });

    test('should be fast (O(1) Set lookup)', () => {
      const { isBlacklisted } = emailValidator;
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        isBlacklisted('test@gmail.com');
      }
      const end = Date.now();
      
      // Should check 1000 emails very quickly
      expect(end - start).toBeLessThan(50);
    });
  });

  describe('Full Email Validation - Production Build', () => {
    test('should reject invalid format immediately', async () => {
      const { checkEmail } = emailValidator;
      
      const result = await checkEmail('invalid.email');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('invalid-format');
    });

    test('should reject blacklisted domains', async () => {
      const { checkEmail } = emailValidator;
      
      const result = await checkEmail('test@0-00.usa.cc');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('blacklist');
    });

    test('should return proper result structure', async () => {
      const { checkEmail } = emailValidator;
      
      const result = await checkEmail('test@nonexistent-domain-12345.com');
      
      // Should have proper structure
      expect(typeof result.isValid).toBe('boolean');
      expect(result.message === undefined || typeof result.message === 'string').toBe(true);
      expect(result.mxRecords === undefined || Array.isArray(result.mxRecords)).toBe(true);
    });
  });

  describe('MX Record Validation - Production Build', () => {
    test('should handle DNS resolution', async () => {
      const { isMXRecordValid } = emailValidator;
      
      const result = await isMXRecordValid('test@thisisanonexistentdomainfortesting.xyz', 1000);
      
      expect(result.isValid).toBe(false);
      expect(['not-found', 'timeout', 'blacklist'].includes(result.message as string)).toBe(true);
    });

    test('should have timeout functionality', async () => {
      const { isMXRecordValid } = emailValidator;
      
      const result = await isMXRecordValid('test@thisisanonexistentdomainfortesting.xyz', 100);
      
      expect(result.isValid).toBe(false);
      expect(['not-found', 'timeout', 'blacklist'].includes(result.message as string)).toBe(true);
    });
  });

  describe('Batch Validation - Production Build', () => {
    test('should validate multiple emails', async () => {
      const { checkEmails } = emailValidator;
      
      const emails = [
        'test@gmail.com',
        'invalid.format',
        'spam@0-00.usa.cc',
        'user@nonexistent-domain-12345.com'
      ];
      
      const results = await checkEmails(emails, 2);
      
      expect(results).toHaveLength(4);
      expect(results.every((r: any) => typeof r.isValid === 'boolean')).toBe(true);
      expect(results.every((r: any) => typeof r.email === 'string')).toBe(true);
      
      // Check specific results
      expect(results.find((r: any) => r.email === 'invalid.format')?.isValid).toBe(false);
      expect(results.find((r: any) => r.email === 'spam@0-00.usa.cc')?.isValid).toBe(false);
    });

    test('should handle empty array', async () => {
      const { checkEmails } = emailValidator;
      
      const results = await checkEmails([]);
      expect(results).toEqual([]);
    });

    test('should preserve email order', async () => {
      const { checkEmails } = emailValidator;
      
      const emails = ['a@test.com', 'b@test.com', 'c@test.com'];
      const results = await checkEmails(emails);
      
      expect(results.map((r: any) => r.email)).toEqual(emails);
    });
  });

  describe('Performance - Production Build', () => {
    test('should handle high volume format validation', () => {
      const { isEmailFormatValid } = emailValidator;
      
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        isEmailFormatValid('test@example.com');
      }
      
      const end = Date.now();
      const duration = end - start;
      
      // Should validate 10k emails in less than 200ms
      expect(duration).toBeLessThan(200);
      
      console.log(`✅ Validated 10,000 emails in ${duration}ms (${Math.round(10000/duration * 1000)} emails/sec)`);
    });

    test('should handle high volume blacklist checking', () => {
      const { isBlacklisted } = emailValidator;
      
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        isBlacklisted('test@gmail.com');
        isBlacklisted('spam@0-00.usa.cc');
      }
      
      const end = Date.now();
      const duration = end - start;
      
      // Should check 20k domains in less than 100ms
      expect(duration).toBeLessThan(100);
      
      console.log(`✅ Checked 20,000 domains in ${duration}ms (${Math.round(20000/duration * 1000)} checks/sec)`);
    });
  });

  describe('Memory Usage - Production Build', () => {
    test('should not leak memory during repeated operations', () => {
      const { isEmailFormatValid, isBlacklisted } = emailValidator;
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 10000; i++) {
        isEmailFormatValid(`test${i}@example.com`);
        isBlacklisted(`test${i}@gmail.com`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`✅ Memory usage increased by ${Math.round(memoryIncrease / 1024 / 1024 * 100) / 100}MB after 20,000 operations`);
    });
  });

  describe('Backward Compatibility - Production Build', () => {
    test('should maintain v1.x API compatibility', () => {
      const { checkEmail, isEmailFormatValid, isMXRecordValid, isBlacklisted } = emailValidator;
      
      // All v1.x functions should exist
      expect(typeof checkEmail).toBe('function');
      expect(typeof isEmailFormatValid).toBe('function');
      expect(typeof isMXRecordValid).toBe('function');
      expect(typeof isBlacklisted).toBe('function');
      
      // v2.0 additions
      expect(typeof emailValidator.checkEmails).toBe('function');
    });

    test('should return compatible result structures', async () => {
      const { checkEmail } = emailValidator;
      
      const result = await checkEmail('test@example.com');
      
      // v1.x result structure
      expect(typeof result.isValid).toBe('boolean');
      expect(result.message === undefined || typeof result.message === 'string').toBe(true);
      expect(result.mxRecords === undefined || Array.isArray(result.mxRecords)).toBe(true);
    });
  });

  describe('Bundle Size Analysis', () => {
    test('should report bundle characteristics', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.join(__dirname, '../../lib/index.js');
      const blacklistPath = path.join(__dirname, '../../lib/blacklist.js');
      
      const indexSize = fs.statSync(indexPath).size;
      const blacklistSize = fs.statSync(blacklistPath).size;
      
      console.log(`📦 Bundle Analysis:`);
      console.log(`  - Core logic: ${Math.round(indexSize / 1024)}KB`);
      console.log(`  - Blacklist data: ${Math.round(blacklistSize / 1024)}KB`);
      console.log(`  - Total package: ${Math.round((indexSize + blacklistSize) / 1024)}KB`);
      
      // Reasonable size expectations
      expect(indexSize).toBeLessThan(800 * 1024); // Core with inlined blacklist is ~760KB
      expect(blacklistSize).toBeLessThan(1000 * 1024); // Blacklist should be <1MB
    });
  });
});