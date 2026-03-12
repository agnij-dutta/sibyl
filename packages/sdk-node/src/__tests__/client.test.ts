import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SibylClient } from '../client';

describe('SibylClient', () => {
  let client: SibylClient;

  beforeEach(() => {
    client = new SibylClient({
      dsn: 'https://testkey123@ingest.sibyl.dev/proj_abc123',
    });
  });

  afterEach(async () => {
    await client.close();
  });

  describe('DSN parsing', () => {
    it('parses DSN correctly', () => {
      const dsn = client.getDSN();
      expect(dsn.protocol).toBe('https:');
      expect(dsn.publicKey).toBe('testkey123');
      expect(dsn.host).toBe('ingest.sibyl.dev');
      expect(dsn.projectId).toBe('proj_abc123');
    });

    it('throws on invalid DSN', () => {
      expect(() => new SibylClient({ dsn: 'not-a-url' })).toThrow();
    });

    it('builds ingest URL from DSN', () => {
      const url = client.getIngestEndpoint();
      expect(url).toBe('https://ingest.sibyl.dev/v1/ingest');
    });
  });

  describe('config defaults', () => {
    it('sets default maxBatchSize', () => {
      expect(client.getConfig().maxBatchSize).toBe(50);
    });

    it('sets default flushInterval', () => {
      expect(client.getConfig().flushInterval).toBe(5000);
    });

    it('sets default sampleRate', () => {
      expect(client.getConfig().sampleRate).toBe(1.0);
    });

    it('respects custom config', async () => {
      const custom = new SibylClient({
        dsn: 'https://key@host.com/proj',
        maxBatchSize: 10,
        flushInterval: 1000,
        sampleRate: 0.5,
      });
      expect(custom.getConfig().maxBatchSize).toBe(10);
      expect(custom.getConfig().flushInterval).toBe(1000);
      expect(custom.getConfig().sampleRate).toBe(0.5);
      await custom.close();
    });
  });

  describe('captureException', () => {
    it('returns an event ID string', () => {
      const id = client.captureException(new Error('test error'));
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns unique IDs for each capture', () => {
      const id1 = client.captureException(new Error('error 1'));
      const id2 = client.captureException(new Error('error 2'));
      expect(id1).not.toBe(id2);
    });
  });

  describe('captureMessage', () => {
    it('returns an event ID string', () => {
      const id = client.captureMessage('test message');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('breadcrumbs', () => {
    it('stores breadcrumbs', () => {
      client.addBreadcrumb({
        type: 'http',
        category: 'fetch',
        message: 'GET /api/users',
        timestamp: new Date().toISOString(),
      });
      expect(client.getBreadcrumbs()).toHaveLength(1);
    });

    it('limits breadcrumbs to 100', () => {
      for (let i = 0; i < 120; i++) {
        client.addBreadcrumb({
          type: 'http',
          category: 'test',
          message: `breadcrumb ${i}`,
          timestamp: new Date().toISOString(),
        });
      }
      expect(client.getBreadcrumbs()).toHaveLength(100);
    });
  });

  describe('flush', () => {
    it('does not throw when buffer is empty', async () => {
      await expect(client.flush()).resolves.toBeUndefined();
    });
  });
});
