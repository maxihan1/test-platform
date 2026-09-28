// 스캔 결과가 부른 사람이 케이스 read 인 서비스 것만 합쳐지는지 본다 (SPEC 도메인/인증 §7 「등급으로 갈리는 자리」)
// 스캐너와 저장소를 흉내 내서 DB 없이 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import type { 사용자 } from '../auth/store.js';

function 명세(tcId: string, filePath: string): CaseSpec {
  return {
    tcId,
    name: '이름',
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath,
  };
}

vi.mock('./store.js', () => ({
  activeServices: async () => [
    { id: 1, prefix: 'XCA', name: '가', testsDir: 'xca' },
    { id: 2, prefix: 'XCB', name: '나', testsDir: 'xcb' },
    { id: 3, prefix: 'XCC', name: '다', testsDir: 'xcc' },
  ],
  save: async (specs: CaseSpec[]) => ({ added: specs.length, updated: 0, deactivated: 0 }),
  findCase: async () => null,
  findService: async () => null,
  listCases: async () => ({ items: [] }),
}));

vi.mock('./scanner.js', () => ({
  testsRoot: () => '/뿌리',
  scan: async (dir: string) => {
    if (dir.endsWith('xca')) return { specs: [명세('XCA-001', 'a.spec.ts')], failures: [], duplicates: [] };
    if (dir.endsWith('xcb')) {
      return {
        specs: [명세('XCB-009', 'b1.spec.ts'), 명세('XCB-009', 'b2.spec.ts')],
        failures: [{ file: '깨짐.spec.ts', message: '나의 비밀 오류' }],
        duplicates: [{ tcId: 'XCB-009', files: ['b1.spec.ts', 'b2.spec.ts'] }],
      };
    }
    return { specs: [명세('XCC-001', 'c.spec.ts'), 명세('XCC-002', 'd.spec.ts')], failures: [], duplicates: [] };
  },
}));

const { default: catalogRoutes } = await import('./routes.js');

function 사람(role: 사용자['role'], 칸들: Record<string, 'none' | 'read' | 'write'>): 사용자 {
  return {
    username: 'xcs-사람',
    displayName: '스캔 검사',
    role,
    dashboard: 'read',
    mustChangePassword: false,
    services: Object.entries(칸들).map(([prefix, cases], i) => ({
      id: i + 1,
      prefix,
      name: prefix,
      color: '#000000',
      envs: [],
      hasSlackWebhook: false,
      testsDir: prefix.toLowerCase(),
      permissions: { cases, runs: 'read', authoring: 'read' },
    })),
  };
}

describe('스캔 결과 거르기', () => {
  let app: FastifyInstance;
  let 부르는이: 사용자 = 사람('member', {});

  beforeAll(async () => {
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = 부르는이;
    });
    await app.register(catalogRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['POST', 'GET'] as const)('%s — 케이스 read 가 가 뿐이면 나의 겹친 번호·오류·건수가 없다', async (method) => {
    부르는이 = 사람('member', { XCA: 'read', XCB: 'none' });
    const body = (await app.inject({ method, url: '/api/catalog/scan' })).json();
    expect(body.duplicates).toEqual([]);
    expect(body.added).toBe(1);
    expect(JSON.stringify(body)).not.toContain('XCB');
    expect(JSON.stringify(body)).not.toContain('나의 비밀 오류');
  });

  it('보이는 서비스 둘은 건수를 합친다', async () => {
    부르는이 = 사람('member', { XCA: 'write', XCC: 'read' });
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(body.added).toBe(3);
    expect(body.error).toBeUndefined();
  });

  it('보이는 서비스에 겹친 번호가 있으면 옛 모양대로 건수 0 과 오류를 준다', async () => {
    부르는이 = 사람('member', { XCA: 'read', XCB: 'read' });
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(body.duplicates).toEqual([{ tcId: 'XCB-009', files: ['b1.spec.ts', 'b2.spec.ts'] }]);
    expect(body.added).toBe(0);
    expect(body.error).toContain('나의 비밀 오류');
  });

  it('admin 은 배정 없이도 살아 있는 서비스 전부를 본다', async () => {
    부르는이 = 사람('admin', {});
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(body.duplicates).toHaveLength(1);
    expect(body.error).toContain('XCB');
  });
});
