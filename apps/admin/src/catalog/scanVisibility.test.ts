// 스캔 결과가 부른 사람이 케이스 read 인 서비스 것만 합쳐지는지 본다 (SPEC 도메인/인증 §7 「등급으로 갈리는 자리」)
// 스캐너 · 저장소 · 지도 채우기(DB 를 쓴다)를 흉내 내서 DB 없이 돈다

import Fastify, { type FastifyInstance } from 'fastify';

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

const 화면지도 = vi.hoisted(() => ({ 차례: [] as string[], 부름: [] as unknown[][], 깨짐: false, 저장: [] as unknown[][], 내림: 7 }));
// 받아 둔 저장소들의 뿌리. 자리 o/r 와 Commander 자리가 있어야 그 아래를 훑는다 — beforeAll 이 임시 폴더로 채운다
const 뿌리 = vi.hoisted(() => ({ 길: '', 기본: '' }));

vi.mock('./store.js', () => ({
  activeServices: async () => [
    { id: 1, prefix: 'XCA', name: '가', testsDir: 'xca', testsRepo: 'https://github.com/o/r' },
    { id: 2, prefix: 'XCB', name: '나', testsDir: 'xcb', testsRepo: 'https://github.com/o/r.git' },
    { id: 3, prefix: 'XCC', name: '다', testsDir: 'xcc', testsRepo: 'https://github.com/maxihan1/test-platform' },
    { id: 4, prefix: 'XCD', name: '라', testsDir: 'xcd', testsRepo: 'https://github.com/o/r' },
    { id: 5, prefix: 'XCE', name: '마', testsDir: 'xce', testsRepo: '' },
    { id: 6, prefix: 'XCF', name: '바', testsDir: 'xcf', testsRepo: 'git@github.com:o/r.git' },
  ],
  save: async (specs: CaseSpec[], deactivate: boolean, prefix: string) => {
    화면지도.차례.push(`저장 ${prefix}`);
    화면지도.저장.push([specs, deactivate, prefix]);
    return { added: specs.length, updated: 0, deactivated: specs.length === 0 ? 화면지도.내림 : 0 };
  },
  findCase: async () => null,
  findService: async () => null,
  listCases: async () => ({ items: [] }),
}));

vi.mock('./reqMap.js', () => ({ 지도채우기: async () => 0 }));
vi.mock('./stepTitles.js', () => ({ 단계제목들: async () => ({ 제목들: new Map(), 문제: [] }) }));
vi.mock('./screenMap.js', () => ({
  화면지도채우기: async (...인자: unknown[]) => {
    화면지도.차례.push(`화면 ${String(인자[1])}`);
    화면지도.부름.push(인자);
    if (화면지도.깨짐) throw new Error('화면 파일 깨짐');
    return 0;
  },
}));

vi.mock('./scanner.js', () => ({
  testsRoot: () => 뿌리.길,
  scanApart: async (dir: string) => {
    if (dir.endsWith('xcd')) throw Object.assign(new Error(`ENOENT: no such file or directory, scandir '${dir}'`), { code: 'ENOENT' });
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
const { 병합뒤훑기 } = await import('./scanRun.js');

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
      projectId: 1,
      projectName: prefix,
      kind: 'SCREEN' as const,
      envs: [],
      hasSlackWebhook: false,
      hasFigmaToken: false,
      testsDir: prefix.toLowerCase(),
      testsRepo: '',
      crawlExclude: [],
      permissions: { cases, runs: 'read', authoring: 'read' },
    })),
  };
}

describe('스캔 결과 거르기', () => {
  let app: FastifyInstance;
  let 부르는이: 사용자 = 사람('member', {});

  beforeAll(async () => {
    뿌리.기본 = await mkdtemp(join(tmpdir(), 'xcs-뿌리-'));
    await mkdir(join(뿌리.기본, 'o', 'r'), { recursive: true });
    await mkdir(join(뿌리.기본, 'maxihan1', 'test-platform'), { recursive: true });
    뿌리.길 = 뿌리.기본;
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
    await rm(뿌리.기본, { recursive: true, force: true });
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

  it('지도 ② 는 케이스를 저장한 뒤 그 케이스로 채우고, 겹친 서비스는 건너뛰고, 깨지면 문제 한 줄로 남긴다', async () => {
    부르는이 = 사람('admin', {});
    화면지도.차례.length = 0;
    화면지도.부름.length = 0;
    화면지도.깨짐 = true;
    let body;
    try {
      body = (await app.inject({ method: 'POST', url: '/api/catalog/scan' })).json();
    } finally {
      화면지도.깨짐 = false;
    }
    expect(화면지도.차례).toEqual(['저장 XCA', '화면 XCA', '저장 XCC', '화면 XCC']);
    expect(화면지도.부름[0]).toEqual([1, 'XCA', 뿌리.기본, 'o/r', [expect.objectContaining({ tcId: 'XCA-001' })], true]);
    expect(body.error).toContain('XCA 서비스의 화면 파일로 지도를 채우지 못했다: 화면 파일 깨짐');
  });

  it('병합 뒤 훑기는 그 서비스만 다시 훑고 나머지 서비스 결과는 지난 스캔 것을 둔다 (PRD-F9-03) · 다른 저장소 서비스는 받아 오기가 훑으니 건너뛴다', async () => {
    부르는이 = 사람('admin', {});
    await app.inject({ method: 'POST', url: '/api/catalog/scan' });
    화면지도.차례.length = 0;
    await 병합뒤훑기(1, app.log);
    expect(화면지도.차례).toEqual([]);
    await 병합뒤훑기(3, app.log);
    expect(화면지도.차례).toEqual(['저장 XCC', '화면 XCC']);
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(body.duplicates).toHaveLength(1);
    expect(body.error).toContain('XCB');
  });

  it.each(['POST', 'GET'] as const)('%s — ?service= 를 주면 그 서비스 것만 낸다 · 다른 서비스의 겹친 번호 · 오류가 안 섞인다 (PRD-F9-19)', async (method) => {
    부르는이 = 사람('member', { XCA: 'read', XCB: 'read' });
    const body = (await app.inject({ method, url: '/api/catalog/scan?service=XCA' })).json();
    expect(body).toMatchObject({ added: 1, duplicates: [] });
    expect(body.error).toBeUndefined();
  });

  it('?service= 로 골라도 케이스 read 가 아닌 서비스 것은 안 보인다', async () => {
    부르는이 = 사람('member', { XCA: 'read', XCB: 'none' });
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan?service=XCB' })).json();
    expect(body.duplicates).toEqual([]);
    expect(JSON.stringify(body)).not.toContain('나의 비밀 오류');
  });

  it('받아 둔 자리가 없으면 알리고 안 건드린다 · 자리는 있는데 테스트 폴더가 아직 없으면 문제로 안 남긴다 · 폴더는 있는데 읽다 사라졌으면 알린다 (PRD-F9-19)', async () => {
    부르는이 = 사람('member', { XCD: 'read' });
    const 다시스캔 = async () => (await app.inject({ method: 'POST', url: '/api/catalog/scan?service=XCD' })).json();
    const 임시 = await mkdtemp(join(tmpdir(), 'xcd-'));
    try {
      뿌리.길 = 임시;
      화면지도.저장.length = 0;
      expect((await 다시스캔()).error).toContain('XCD 서비스의 테스트 저장소 o/r를 아직 받아 오지 못해 케이스를 지난 스캔 그대로 뒀다');
      expect(화면지도.저장).toEqual([]);
      await mkdir(join(임시, 'o', 'r'), { recursive: true });
      expect((await 다시스캔()).error).toBeUndefined();
      await mkdir(join(임시, 'o', 'r', 'tests', 'xcd'), { recursive: true });
      expect((await 다시스캔()).error).toContain('XCD 서비스의 테스트 폴더 o/r/tests/xcd을 읽지 못했다');
    } finally {
      뿌리.길 = 뿌리.기본;
      await rm(임시, { recursive: true, force: true });
    }
  });

  it('저장소 칸이 빈 서비스는 조용히 건너뛰고 꼴이 틀린 옛 값은 알린다', async () => {
    부르는이 = 사람('member', { XCE: 'read', XCF: 'read' });
    화면지도.저장.length = 0;
    const body = (await app.inject({ method: 'POST', url: '/api/catalog/scan' })).json();
    expect(body.error).toContain('XCF 서비스의 테스트 저장소 주소 git@github.com:o/r.git가 https://github.com/<소유자>/<이름> 꼴이 아니라 훑지 않았다');
    expect(body.error).not.toContain('XCE');
    expect(화면지도.저장.map((x) => x[2])).not.toContain('XCE');
  });

  it('자리의 tests 에 다른 폴더가 있는데 서비스 폴더가 없으면 케이스 0건으로 저장해 비활성으로 내리고 건수를 알린다 · 숨김 항목뿐이면 안 건드린다', async () => {
    부르는이 = 사람('member', { XCD: 'read' });
    const 다시스캔 = async () => (await app.inject({ method: 'POST', url: '/api/catalog/scan?service=XCD' })).json();
    const 임시 = await mkdtemp(join(tmpdir(), 'xcd-'));
    try {
      뿌리.길 = 임시;
      화면지도.저장.length = 0;
      await mkdir(join(임시, 'o', 'r', 'tests'), { recursive: true });
      await 다시스캔();
      await writeFile(join(임시, 'o', 'r', 'tests', '.gitkeep'), '');
      await mkdir(join(임시, 'o', 'r', 'tests', 'lost+found'));
      await 다시스캔();
      expect(화면지도.저장).toEqual([]);

      await mkdir(join(임시, 'o', 'r', 'tests', 'xca'));
      화면지도.차례.length = 0;
      const body = await 다시스캔();
      expect(body.error).toContain('XCD 서비스의 테스트 폴더 o/r/tests/xcd에 케이스가 없어 7건을 비활성으로 내렸다');
      expect(화면지도.저장).toEqual([[[], true, 'XCD']]);
      expect(화면지도.차례).toEqual(['저장 XCD', '화면 XCD']);

      화면지도.내림 = 0;
      expect((await 다시스캔()).error).toBeUndefined();
    } finally {
      화면지도.내림 = 7;
      뿌리.길 = 뿌리.기본;
      await rm(임시, { recursive: true, force: true });
    }
  });

  it('?service= 로 「다시 스캔」 하면 그 서비스만 훑는다 · 스캔 시각은 서비스마다 따로다 (PRD-F9-19)', async () => {
    부르는이 = 사람('admin', {});
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-12T00:00:00Z'));
      await app.inject({ method: 'POST', url: '/api/catalog/scan' });
      vi.setSystemTime(new Date('2026-10-12T05:00:00Z'));
      화면지도.차례.length = 0;
      await app.inject({ method: 'POST', url: '/api/catalog/scan?service=XCC' });
    } finally {
      vi.useRealTimers();
    }
    expect(화면지도.차례).toEqual(['저장 XCC', '화면 XCC']);
    const 시각 = async (질의: string) => (await app.inject({ method: 'GET', url: `/api/catalog/scan${질의}` })).json().scannedAt;
    expect(await 시각('?service=XCC')).toBe('2026-10-12T05:00:00.000Z');
    expect(await 시각('?service=XCA')).toBe('2026-10-12T00:00:00.000Z');
    expect(await 시각('')).toBe('2026-10-12T00:00:00.000Z');
  });

  it('admin 은 배정 없이도 살아 있는 서비스 전부를 본다', async () => {
    부르는이 = 사람('admin', {});
    const body = (await app.inject({ method: 'GET', url: '/api/catalog/scan' })).json();
    expect(body.duplicates).toHaveLength(1);
    expect(body.error).toContain('XCB');
  });
});
