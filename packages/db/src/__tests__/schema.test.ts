import { describe, it, expect } from 'vitest';
import {
  organizations,
  users,
  projects,
  apiKeys,
  investigations,
  incidents,
  alertRules,
  deploys,
  investigationStatusEnum,
  incidentLevelEnum,
  incidentStatusEnum,
  alertRuleTypeEnum,
} from '../schema';

describe('Database Schema', () => {
  describe('Enums', () => {
    it('investigationStatusEnum has correct values', () => {
      expect(investigationStatusEnum.enumValues).toEqual(['running', 'completed', 'failed']);
    });

    it('incidentLevelEnum has correct values', () => {
      expect(incidentLevelEnum.enumValues).toEqual(['error', 'warning', 'info']);
    });

    it('incidentStatusEnum has correct values', () => {
      expect(incidentStatusEnum.enumValues).toEqual(['open', 'resolved', 'ignored']);
    });

    it('alertRuleTypeEnum has correct values', () => {
      expect(alertRuleTypeEnum.enumValues).toEqual(['threshold', 'anomaly', 'pattern']);
    });
  });

  describe('organizations table', () => {
    it('has required columns', () => {
      const cols = Object.keys(organizations);
      expect(cols).toContain('id');
      expect(cols).toContain('name');
      expect(cols).toContain('slug');
      expect(cols).toContain('plan');
      expect(cols).toContain('createdAt');
      expect(cols).toContain('updatedAt');
    });
  });

  describe('users table', () => {
    it('has required columns', () => {
      const cols = Object.keys(users);
      expect(cols).toContain('id');
      expect(cols).toContain('orgId');
      expect(cols).toContain('email');
      expect(cols).toContain('passwordHash');
      expect(cols).toContain('name');
      expect(cols).toContain('role');
    });
  });

  describe('projects table', () => {
    it('has required columns', () => {
      const cols = Object.keys(projects);
      expect(cols).toContain('id');
      expect(cols).toContain('orgId');
      expect(cols).toContain('name');
      expect(cols).toContain('dsn');
      expect(cols).toContain('platform');
    });
  });

  describe('apiKeys table', () => {
    it('has required columns', () => {
      const cols = Object.keys(apiKeys);
      expect(cols).toContain('id');
      expect(cols).toContain('projectId');
      expect(cols).toContain('keyHash');
      expect(cols).toContain('keyPrefix');
      expect(cols).toContain('scopes');
    });
  });

  describe('investigations table', () => {
    it('has required columns', () => {
      const cols = Object.keys(investigations);
      expect(cols).toContain('id');
      expect(cols).toContain('projectId');
      expect(cols).toContain('query');
      expect(cols).toContain('status');
      expect(cols).toContain('messages');
      expect(cols).toContain('rootCause');
      expect(cols).toContain('confidence');
    });
  });

  describe('incidents table', () => {
    it('has required columns', () => {
      const cols = Object.keys(incidents);
      expect(cols).toContain('id');
      expect(cols).toContain('projectId');
      expect(cols).toContain('fingerprint');
      expect(cols).toContain('title');
      expect(cols).toContain('level');
      expect(cols).toContain('status');
      expect(cols).toContain('eventCount');
      expect(cols).toContain('affectedUsers');
    });
  });

  describe('alertRules table', () => {
    it('has required columns', () => {
      const cols = Object.keys(alertRules);
      expect(cols).toContain('id');
      expect(cols).toContain('projectId');
      expect(cols).toContain('name');
      expect(cols).toContain('type');
      expect(cols).toContain('condition');
      expect(cols).toContain('channels');
      expect(cols).toContain('enabled');
    });
  });

  describe('deploys table', () => {
    it('has required columns', () => {
      const cols = Object.keys(deploys);
      expect(cols).toContain('id');
      expect(cols).toContain('projectId');
      expect(cols).toContain('version');
      expect(cols).toContain('environment');
      expect(cols).toContain('commitSha');
      expect(cols).toContain('deployedAt');
    });
  });
});
