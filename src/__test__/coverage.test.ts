/**
 * Coverage tests for email-validator-node v2.0
 * Targets uncovered lines and branches
 */

import { 
  checkEmail, 
  checkEmails, 
  isBlacklisted, 
  ValidationResult 
} from '../index';

describe('Coverage Tests - Missing Lines', () => {
  describe('checkEmail Function (Lines 15-25)', () => {
    test('should handle invalid format', async () => {
      const result = await checkEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('invalid-format');
      expect(result.mxRecords).toBeUndefined();
    });

    test('should handle blacklisted domain', async () => {
      const result = await checkEmail('test@10minutemail.com');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('blacklist');
      expect(result.mxRecords).toBeUndefined();
    });

    test('should proceed to MX validation for valid format and non-blacklisted', async () => {
      // Mock DNS resolution to avoid actual network calls
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: 'mx.testdomain.com' }]);
      });

      const result = await checkEmail('test@testdomain.com');
      expect(result.isValid).toBe(true);
      expect(result.mxRecords).toBeDefined();

      // Restore original function
      dns.resolveMx = originalResolveMx;
    });
  });

  describe('domainSuffixes and isBlacklisted Functions (Lines 45-61)', () => {
    test('should generate domain suffixes correctly', () => {
      // Testing the internal domainSuffixes function through isBlacklisted
      const result1 = isBlacklisted('test@mail.sub.example.com');
      const result2 = isBlacklisted('test@10minutemail.com'); // Known blacklisted
      const result3 = isBlacklisted('test@gmail.com'); // Not blacklisted

      expect(typeof result1).toBe('boolean');
      expect(result2).toBe(true);
      expect(result3).toBe(false);
    });

    test('should handle single domain', () => {
      const result = isBlacklisted('test@0-00.usa.cc'); // First item in blacklist
      expect(result).toBe(true);
    });

    test('should handle subdomain blacklisting', () => {
      // If parent domain is blacklisted, subdomain should also be blocked
      const result = isBlacklisted('test@mail.10minutemail.com');
      expect(result).toBe(true);
    });

    test('should handle clean domains', () => {
      const cleanDomains = [
        'gmail.com',
        'yahoo.com', 
        'outlook.com',
        'hotmail.com',
        'company.co.uk'
      ];

      cleanDomains.forEach(domain => {
        const result = isBlacklisted(`test@${domain}`);
        expect(result).toBe(false);
      });
    });
  });

  describe('checkEmails Batch Function (Lines 172-209)', () => {
    test('should handle empty array', async () => {
      const results = await checkEmails([]);
      expect(results).toEqual([]);
    });

    test('should handle single email', async () => {
      // Mock DNS for consistent testing
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: 'mx.testdomain.com' }]);
      });

      const results = await checkEmails(['test@testdomain.com']);
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('test@testdomain.com');
      expect(results[0].isValid).toBe(true);

      dns.resolveMx = originalResolveMx;
    });

    test('should handle multiple emails with same domain', async () => {
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: 'mx.testdomain.com' }]);
      });

      const emails = [
        'user1@testdomain.com',
        'user2@testdomain.com',
        'user3@testdomain.com'
      ];

      const results = await checkEmails(emails);
      expect(results).toHaveLength(3);
      
      results.forEach((result, index) => {
        expect(result.email).toBe(emails[index]);
        expect(result.isValid).toBe(true);
      });

      // Should only call DNS once per domain
      expect(dns.resolveMx).toHaveBeenCalledTimes(1);

      dns.resolveMx = originalResolveMx;
    });

    test('should handle multiple domains with batching', async () => {
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: `mx.${domain}` }]);
      });

      const emails = [
        'test@testdomain1.com',
        'test@testdomain2.com', 
        'test@testdomain3.com',
        'test@testdomain1.com' // Duplicate domain
      ];

      const results = await checkEmails(emails, 2); // Concurrency of 2
      expect(results).toHaveLength(4);
      
      // Should call DNS for each unique domain (3 times)
      expect(dns.resolveMx).toHaveBeenCalledTimes(3);

      dns.resolveMx = originalResolveMx;
    });

    test('should handle invalid emails in batch', async () => {
      const emails = [
        'valid@testdomain.com',
        'invalid-email',
        'test@10minutemail.com', // Blacklisted
        ''
      ];

      const results = await checkEmails(emails);
      expect(results).toHaveLength(4);
      
      expect(results[1].isValid).toBe(false);
      expect(results[1].message).toBe('invalid-format');
      expect(results[2].isValid).toBe(false);
      expect(results[2].message).toBe('blacklist');
      expect(results[3].isValid).toBe(false);
      expect(results[3].message).toBe('invalid-format');
    });

    test('should handle emails without domain part', async () => {
      const results = await checkEmails(['test@']);
      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].message).toBe('invalid-format');
    });

    test('should preserve email in results', async () => {
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: 'mx.testdomain.com' }]);
      });

      const email = 'specific@testdomain.com';
      const results = await checkEmails([email]);
      
      expect(results[0].email).toBe(email);
      expect(results[0]).toHaveProperty('isValid');
      if (results[0].isValid) {
        expect(results[0]).toHaveProperty('mxRecords');
      }

      dns.resolveMx = originalResolveMx;
    });

    test('should handle large batch processing', async () => {
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(null, [{ priority: 10, exchange: 'mx.testdomain.com' }]);
      });

      // Generate 100 emails across 10 domains
      const emails = [];
      for (let i = 0; i < 100; i++) {
        const domain = `testdomain${i % 10}.com`;
        emails.push(`user${i}@${domain}`);
      }

      const results = await checkEmails(emails, 3); // Test with concurrency
      expect(results).toHaveLength(100);
      
      // Should call DNS only 10 times (one per unique domain)
      expect(dns.resolveMx).toHaveBeenCalledTimes(10);

      dns.resolveMx = originalResolveMx;
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle malformed domain in batch processing', async () => {
      const emails = ['test@', 'test@testdomain.com', '@testdomain.com'];
      const results = await checkEmails(emails);
      
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(false);
      expect(results[2].isValid).toBe(false);
    });

    test('should handle network errors gracefully in batch', async () => {
      const dns = require('dns');
      const originalResolveMx = dns.resolveMx;
      dns.resolveMx = jest.fn((domain, callback) => {
        callback(new Error('Network error'), null);
      });

      const results = await checkEmails(['test@testdomain.com']);
      expect(results[0].isValid).toBe(false);
      expect(results[0].message).toBe('Network error');

      dns.resolveMx = originalResolveMx;
    });
  });
});