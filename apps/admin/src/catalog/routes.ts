// 카탈로그 컨텍스트의 HTTP 라우트 (SPEC §7 Catalog)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { join } from 'node:path';

import { scan, testsRoot, type Duplicate } from './scanner.js';
import { readExcerpt } from './source.js';
import { activeServices, findCase, findService, listCases, save } from './store.js';

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

      // 폴더가 아직 안 채워졌거나 이름이 틀리면 여기서 던진다. 그 서비스만 접고 나머지는 계속 훑는다 —
      // 한 서비스 때문에 다른 서비스의 케이스까지 사라지면 목록이 통째로 거짓말을 한다 (SPEC §3.1)
      let found;
      try {
        found = await scan(join(root, service.testsDir));
      } catch (err) {
        problems.push(
          `${service.prefix} 서비스의 테스트 폴더 ${service.testsDir}을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

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

// 배정 판정은 「지금 부른 사람이 누구인가」를 알아야 한다. 인증이 붙기 전까지는 활성 서비스면 통과시킨다.
// 갈아 끼울 자리를 이 함수 하나로 묶어 둔다 — WS-F가 안을 채운다 (SPEC §3.5 · §7)
async function 볼수있나(prefix: string): Promise<boolean> {
  return (await findService(prefix)) !== null;
}

export default async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // 배포는 컨테이너 재기동이다. 뜨는 김에 한 번 훑어 두면 배포 직후 목록이 최신이 된다 (SPEC §3.1)
  startup = runScan(app.log);

  app.post('/catalog/scan', async () => runScan(app.log));

  app.get('/catalog/scan', async () => last ?? (startup === null ? null : await startup));

  app.get<{ Querystring: { service?: string; q?: string; platform?: string; active?: string; page?: string } }>(
    '/catalog/cases',
    async (req, reply) => {
      const service = req.query.service ?? '';
      // 서비스는 검색 조건이 아니라 맨 위 띠의 선택이고 서버가 늘 적용한다 (SPEC §8 · §8.1)
      if (service === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
      if (!(await 볼수있나(service))) {
        // 404로 감추지 않는다. 화면이 그 자리를 아예 안 보여주므로 여기까지 닿은 요청은
        // 화면의 버그이거나 직접 찌른 것이고, 둘 다 감추는 편이 더 나쁘다 (SPEC §3.5)
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: service });
      }

      const platform = req.query.platform;
      return listCases({
        service,
        q: req.query.q ?? '',
        platform: platform === 'desktop' || platform === 'mobile' ? platform : undefined,
        activeOnly: req.query.active !== 'false',
        page: Math.max(1, Number(req.query.page ?? 1) || 1),
        pageSize: PAGE_SIZE,
      });
    },
  );

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
