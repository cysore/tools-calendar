/**
 * Tests for subscription management utilities
 */

import {
  generateSubscriptionKey,
  generateSubscriptionUrl,
  validateSubscriptionKey,
  getSubscriptionInstructions,
  createDefaultSubscriptionSettings,
  regenerateSubscription,
} from '@/lib/subscription';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Subscription Key Management', () => {
  describe('generateSubscriptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateSubscriptionKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateSubscriptionKey();
      const key2 = generateSubscriptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate cryptographically secure keys', () => {
      const keys = new Set();

      // Generate 100 keys and ensure they're all unique
      for (let i = 0; i < 100; i++) {
        keys.add(generateSubscriptionKey());
      }

      expect(keys.size).toBe(100);
    });
  });

  describe('validateSubscriptionKey', () => {
    it('should validate correct subscription keys', () => {
      const validKey = generateSubscriptionKey();
      expect(validateSubscriptionKey(validKey)).toBe(true);
    });

    it('should reject invalid subscription keys', () => {
      expect(validateSubscriptionKey('')).toBe(false);
      expect(validateSubscriptionKey('invalid')).toBe(false);
      expect(validateSubscriptionKey('123')).toBe(false);
      expect(validateSubscriptionKey('g'.repeat(64))).toBe(false); // Invalid hex
      expect(validateSubscriptionKey('a'.repeat(63))).toBe(false); // Too short
      expect(validateSubscriptionKey('a'.repeat(65))).toBe(false); // Too long
    });

    it('should handle uppercase hex characters', () => {
      const mixedCaseKey = 'A'.repeat(32) + 'a'.repeat(32);
      expect(validateSubscriptionKey(mixedCaseKey)).toBe(false); // Should be lowercase only
    });
  });
});

describe('Subscription URL Generation', () => {
  describe('generateSubscriptionUrl', () => {
    it('should generate URL with default base URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      const teamId = 'team-123';
      const subscriptionKey = 'a'.repeat(64);
      const url = generateSubscriptionUrl(teamId, subscriptionKey);

      expect(url).toBe(
        `https://example.com/api/teams/${teamId}/subscription/${subscriptionKey}`
      );
    });

    it('should use provided base URL', () => {
      const teamId = 'team-123';
      const subscriptionKey = 'b'.repeat(64);
      const baseUrl = 'https://custom.domain.com';
      const url = generateSubscriptionUrl(teamId, subscriptionKey, baseUrl);

      expect(url).toBe(
        `${baseUrl}/api/teams/${teamId}/subscription/${subscriptionKey}`
      );
    });

    it('should fallback to localhost when no environment variable', () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const teamId = 'team-123';
      const subscriptionKey = 'c'.repeat(64);
      const url = generateSubscriptionUrl(teamId, subscriptionKey);

      expect(url).toBe(
        `http://localhost:3000/api/teams/${teamId}/subscription/${subscriptionKey}`
      );
    });
  });
});

describe('Subscription Instructions', () => {
  describe('getSubscriptionInstructions', () => {
    it('should return instructions for all supported platforms', () => {
      const subscriptionUrl =
        'https://example.com/api/teams/team-123/subscription/abc123';
      const instructions = getSubscriptionInstructions(subscriptionUrl);

      expect(instructions).toHaveLength(4);

      const platforms = instructions.map(inst => inst.platform);
      expect(platforms).toContain('ios');
      expect(platforms).toContain('google');
      expect(platforms).toContain('outlook');
      expect(platforms).toContain('apple');
    });

    it('should include subscription URL in all instruction sets', () => {
      const subscriptionUrl =
        'https://example.com/api/teams/team-123/subscription/abc123';
      const instructions = getSubscriptionInstructions(subscriptionUrl);

      instructions.forEach(instruction => {
        const hasUrl = instruction.steps.some(step =>
          step.includes(subscriptionUrl)
        );
        expect(hasUrl).toBe(true);
      });
    });

    it('should have proper structure for each instruction set', () => {
      const subscriptionUrl = 'https://example.com/subscription/test';
      const instructions = getSubscriptionInstructions(subscriptionUrl);

      instructions.forEach(instruction => {
        expect(instruction).toHaveProperty('platform');
        expect(instruction).toHaveProperty('title');
        expect(instruction).toHaveProperty('steps');
        expect(Array.isArray(instruction.steps)).toBe(true);
        expect(instruction.steps.length).toBeGreaterThan(0);
        expect(typeof instruction.title).toBe('string');
        expect(typeof instruction.platform).toBe('string');
      });
    });

    it('should provide Chinese instructions', () => {
      const subscriptionUrl = 'https://example.com/subscription/test';
      const instructions = getSubscriptionInstructions(subscriptionUrl);

      // Check that instructions contain Chinese characters
      const hasChineseInstructions = instructions.some(instruction =>
        instruction.steps.some(step => /[\u4e00-\u9fff]/.test(step))
      );

      expect(hasChineseInstructions).toBe(true);
    });
  });
});

describe('Subscription Settings', () => {
  describe('createDefaultSubscriptionSettings', () => {
    it('should create default settings with correct structure', () => {
      const teamId = 'team-123';
      const subscriptionKey = 'a'.repeat(64);
      const settings = createDefaultSubscriptionSettings(
        teamId,
        subscriptionKey
      );

      expect(settings).toEqual({
        teamId,
        subscriptionKey,
        subscriptionUrl: expect.stringContaining(teamId),
        isEnabled: true,
        accessCount: 0,
      });
    });

    it('should generate proper subscription URL', () => {
      const teamId = 'team-456';
      const subscriptionKey = 'b'.repeat(64);
      const settings = createDefaultSubscriptionSettings(
        teamId,
        subscriptionKey
      );

      expect(settings.subscriptionUrl).toContain(
        `/api/teams/${teamId}/subscription/${subscriptionKey}`
      );
    });
  });

  describe('regenerateSubscription', () => {
    it('should generate new key and URL', () => {
      const teamId = 'team-789';
      const result = regenerateSubscription(teamId);

      expect(result).toHaveProperty('subscriptionKey');
      expect(result).toHaveProperty('subscriptionUrl');
      expect(validateSubscriptionKey(result.subscriptionKey)).toBe(true);
      expect(result.subscriptionUrl).toContain(teamId);
      expect(result.subscriptionUrl).toContain(result.subscriptionKey);
    });

    it('should generate different keys on multiple calls', () => {
      const teamId = 'team-abc';
      const result1 = regenerateSubscription(teamId);
      const result2 = regenerateSubscription(teamId);

      expect(result1.subscriptionKey).not.toBe(result2.subscriptionKey);
      expect(result1.subscriptionUrl).not.toBe(result2.subscriptionUrl);
    });
  });
});

describe('Integration Tests', () => {
  it('should work with generated keys and URLs', () => {
    const teamId = 'integration-test-team';

    // Generate a subscription key
    const subscriptionKey = generateSubscriptionKey();
    expect(validateSubscriptionKey(subscriptionKey)).toBe(true);

    // Generate URL
    const subscriptionUrl = generateSubscriptionUrl(teamId, subscriptionKey);
    expect(subscriptionUrl).toContain(teamId);
    expect(subscriptionUrl).toContain(subscriptionKey);

    // Get instructions
    const instructions = getSubscriptionInstructions(subscriptionUrl);
    expect(instructions.length).toBeGreaterThan(0);

    // Create settings
    const settings = createDefaultSubscriptionSettings(teamId, subscriptionKey);
    expect(settings.subscriptionUrl).toBe(subscriptionUrl);
  });

  it('should handle regeneration workflow', () => {
    const teamId = 'regeneration-test';

    // Initial setup
    const initialKey = generateSubscriptionKey();
    const initialSettings = createDefaultSubscriptionSettings(
      teamId,
      initialKey
    );

    // Regenerate
    const regenerated = regenerateSubscription(teamId);

    // Verify changes
    expect(regenerated.subscriptionKey).not.toBe(initialKey);
    expect(regenerated.subscriptionUrl).not.toBe(
      initialSettings.subscriptionUrl
    );
    expect(validateSubscriptionKey(regenerated.subscriptionKey)).toBe(true);
  });
});

describe('Security Considerations', () => {
  it('should generate keys with sufficient entropy', () => {
    const keys = [];

    // Generate multiple keys and check for patterns
    for (let i = 0; i < 10; i++) {
      keys.push(generateSubscriptionKey());
    }

    // Check that keys don't have obvious patterns
    keys.forEach(key => {
      // Should not be all the same character
      expect(key).not.toBe(key[0].repeat(64));

      // Should not be sequential
      expect(key).not.toMatch(/^0123456789abcdef/);
    });
  });

  it('should not expose sensitive information in URLs', () => {
    const teamId = 'sensitive-team';
    const subscriptionKey = generateSubscriptionKey();
    const url = generateSubscriptionUrl(teamId, subscriptionKey);

    // URL should not contain obvious sensitive patterns
    expect(url).not.toContain('password');
    expect(url).not.toContain('secret');
    expect(url).not.toContain('token');

    // Should only contain the subscription key we provided
    expect(url).toContain(subscriptionKey);
  });
});
