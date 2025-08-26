/**
 * Integration tests for email-validator-node v2.0
 * Tests the actual compiled functionality
 */

import { isEmailFormatValid } from '../index';

describe('Integration Tests - Compiled Functionality', () => {
  describe('Format Validation (Synchronous)', () => {
    test('should validate common email formats', () => {
      // Valid formats
      expect(isEmailFormatValid('test@gmail.com')).toBe(true);
      expect(isEmailFormatValid('user.name@company.co.uk')).toBe(true);
      expect(isEmailFormatValid('admin+tag@subdomain.example.com')).toBe(true);
      
      // Invalid formats  
      expect(isEmailFormatValid('invalid.email')).toBe(false);
      expect(isEmailFormatValid('')).toBe(false);
      expect(isEmailFormatValid('test@')).toBe(false);
      expect(isEmailFormatValid('@example.com')).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(isEmailFormatValid(null as any)).toBe(false);
      expect(isEmailFormatValid(undefined as any)).toBe(false);
      expect(isEmailFormatValid(123 as any)).toBe(false);
    });
  });

  describe('Performance Validation', () => {
    test('should be fast for format validation', () => {
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        isEmailFormatValid('test@example.com');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should validate 10k emails in <100ms
    });
  });

  describe('API Stability', () => {
    test('should maintain backward compatible API', () => {
      const result = isEmailFormatValid('test@example.com');
      expect(typeof result).toBe('boolean');
    });
  });
});