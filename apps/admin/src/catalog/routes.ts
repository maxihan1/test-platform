// 카탈로그 컨텍스트의 HTTP 라우트 (SPEC §7 Catalog)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { join } from 'node:path';

import { scan, testsRoot, type Duplicate } from './scanner.js';
import { readExcerpt } from './source.js';
import { activeServices, findCase, listCases, save } from './store.js';

const PAGE_SIZE = 50;

export interface LastScan {
  scannedAt: string;
  added: number;
  updated: number;
  deactivated: number;
  duplicates: Duplicate[];
  error?: string;
}

let last: LastScan | null = null;
// 기동 시 스캔이 아직 안 끝났는데 화면이 결과를 물어볼 수 있다. 그때는 이 약속을 기다린다
let startup: Promise<LastScan> | null = null;

async function runScan(log: FastifyBaseLogger): Promise<LastScan> {
  const scannedAt = new Date().toISOString();
  const empty = { scannedAt, added: 0, updated: 0, deactivated: 0 };

  try {
    // 서비스마다 자기 폴더만 훑는다. 다른 서비스의 폴더는 보지 않는다 (SPEC §9.2).
    // 서비스가 하나도 없으면 훑을 폴더가 없다 — 첫 서비스는 설정에서 만든다 (§8.8)
    const services = await activeServices();
    const root = testsRoot();

    const total = { added: 0, updated: 0, deactivated: 0 };
    const duplicates: Duplicate[] = [];
    const problems: string[] = [];

    for (const service of services) {
      const 어디 = (file: string): string => join(service.testsDir, file);
      const found = await scan(join(root, service.testsDir));

      duplicates.push(...found.duplicates.map((d) => ({ tcId: d.tcId, files: d.files })));
      problems.push(
        ...found.duplicates.map((d) => `tcId ${d.tcId}이 ${d.files[0]}와 ${d.files[1]}에 겹쳐 있다`),
        ...found.failures.map((f) => `${어디(f.file)}을 읽지 못했다: ${f.message}`),
      );

      // 폴더에 남의 접두사가 섞여 있으면 걸러 낸다. 그 케이스의 주인은 다른 서비스다 (SPEC §9.2)
      const 제것인가 = (tcId: string): boolean => tcId.startsWith(`${service.prefix}-`);
      const 내것 = found.specs.filter((s) => 제것인가(s.tcId));
      for (const 남 of found.specs.filter((s) => !제것인가(s.tcId))) {
        problems.push(`${남.filePath}의 ${남.tcId}은 ${service.prefix} 서비스의 접두사가 아니라 걸러 냈다`);
      }

      // 중복은 그 서비스의 스캔 실패다. 어느 쪽이 진짜인지 모르는 채로 캐시를 덮어쓰면
      // 목록이 거짓말을 한다 (SPEC §3.1). 다른 서비스까지 버리지는 않는다
      if (found.duplicates.length > 0) continue;

      // 읽지 못한 파일이 있으면 무엇이 정말 사라졌는지 가릴 수 없다. 비활성 처리는 건너뛰고 읽은 것만 갱신한다
      const saved = await save(내것, found.failures.length === 0, service.prefix);
      total.added += saved.added;
      total.updated += saved.updated;
      total.deactivated += saved.deactivated;
    }

    if (duplicates.length > 0) {
      last = { ...empty, duplicates, error: problems.join('\n') };
      log.error(`[catalog] 스캔 실패 — ${problems.join(' / ')}`);
      return last;
    }

    last = {
      scannedAt,
      ...total,
      duplicates: [],
      error: problems.length > 0 ? problems.join('\n') : undefined,
    };
    if (problems.length > 0) log.warn(`[catalog] 스캔 일부 실패 — ${problems.join(' / ')}`);
    return last;
  } catch (err) {
    // 기동 시 스캔이 깨져도 admin은 떠야 한다. 사유만 마지막 결과에 남긴다 (SPEC §3.1)
    const message = err instanceof Error ? err.message : String(err);
    last = { ...empty, duplicates: [], error: message };
    log.error(`[catalog] 스캔이 깨졌다: ${message}`);
    return last;
  }
}

export default async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // 배포는 컨테이너 재기동이다. 뜨는 김에 한 번 훑어 두면 배포 직후 목록이 최신이 된다 (SPEC §3.1)
  startup = runScan(app.log);

  app.post('/catalog/scan', async () => runScan(app.log));

  app.get('/catalog/scan', async () => last ?? (startup === null ? null : await startup));

  app.get<{ Querystring: { q?: string; page?: string } }>('/catalog/cases', async (req) => {
    const page = Math.max(1, Number(req.query.page ?? 1) || 1);
    return listCases(req.query.q ?? '', page, PAGE_SIZE);
  });

  app.get<{ Params: { tcId: string } }>('/catalog/cases/:tcId', async (req, reply) => {
    const found = await findCase(req.params.tcId);
    if (found === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.params.tcId });
    return found;
  });

  app.get<{ Params: { tcId: string }; Querystring: { line?: string } }>(
    '/cases/:tcId/source',
    async (req, reply) => {
      const found = await findCase(req.params.tcId);
      if (found === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.params.tcId });

      const line = req.query.line === undefined ? undefined : Number(req.query.line);
      try {
        return await readExcerpt(found.filePath, Number.isFinite(line) ? line : undefined);
      } catch (err) {
        // 코드가 진실의 원천인데 파일이 없다. 캐시가 낡았다는 뜻이므로 사유를 그대로 알린다
        return reply.code(404).send({
          error: 'SOURCE_NOT_FOUND',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );
}
