/**
 * Unit tests for authentication utilities
 */

import {
  hasRole,
  requireRole,
  isTeamOwner,
  canEditEvents,
  canManageTeam,
} from '@/lib/auth-utils';
import { UserRole } from '@/types/auth';

describe('Authentication Utilities', () => {
  describe('hasRole', () => {
    it('should return true when user has exact required role', () => {
      expect(hasRole('member', 'member')).toBe(true);
      expect(hasRole('owner', 'owner')).toBe(true);
      expect(hasRole('viewer', 'viewer')).toBe(true);
    });

    it('should return true when user has higher role than required', () => {
      expect(hasRole('owner', 'member')).toBe(true);
      expect(hasRole('owner', 'viewer')).toBe(true);
      expect(hasRole('member', 'viewer')).toBe(true);
    });

    it('should return false when user has lower role than required', () => {
      expect(hasRole('viewer', 'member')).toBe(false);
      expect(hasRole('viewer', 'owner')).toBe(false);
      expect(hasRole('member', 'owner')).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('should not throw when user has sufficient role', () => {
      expect(() => requireRole('owner', 'member')).not.toThrow();
      expect(() => requireRole('member', 'viewer')).not.toThrow();
      expect(() => requireRole('owner', 'owner')).not.toThrow();
    });

    it('should throw when user has insufficient role', () => {
      expect(() => requireRole('viewer', 'member')).toThrow(
        'Insufficient permissions'
      );
      expect(() => requireRole('member', 'owner')).toThrow(
        'Insufficient permissions'
      );
    });
  });

  describe('isTeamOwner', () => {
    it('should return true for owner role', () => {
      expect(isTeamOwner('owner')).toBe(true);
    });

    it('should return false for non-owner roles', () => {
      expect(isTeamOwner('member')).toBe(false);
      expect(isTeamOwner('viewer')).toBe(false);
    });
  });

  describe('canEditEvents', () => {
    it('should return true for member and owner roles', () => {
      expect(canEditEvents('member')).toBe(true);
      expect(canEditEvents('owner')).toBe(true);
    });

    it('should return false for viewer role', () => {
      expect(canEditEvents('viewer')).toBe(false);
    });
  });

  describe('canManageTeam', () => {
    it('should return true only for owner role', () => {
      expect(canManageTeam('owner')).toBe(true);
    });

    it('should return false for non-owner roles', () => {
      expect(canManageTeam('member')).toBe(false);
      expect(canManageTeam('viewer')).toBe(false);
    });
  });
});
