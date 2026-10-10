// 카탈로그 컨텍스트의 HTTP 라우트 (SPEC §7 Catalog)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyBaseLogger, FastifyInstance } from 'fastify';

import { join } from 'node:path';

import { TECHNIQUES, type Technique } from '@platform/kit/types';

import { 칸되는서비스 } from '../auth/permissions.js';
import type { 사용자 } from '../auth/store.js';
import { renderCatalogXlsx } from './export.js';
import { 엑셀자료, 한국시각 } from './exportData.js';
import { 지도채우기 } from './reqMap.js';
import { scan, testsRoot, type Duplicate } from './scanner.js';
import { 화면지도채우기 } from './screenMap.js';
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

// 스캔은 서비스마다 돈다. 결과를 서비스별로 들고 있어야 응답을 부른 사람이 볼 수 있는 서비스 것만 합칠 수 있다 (SPEC §7)
interface 서비스결과 {
  added: number;
  updated: number;
  deactivated: number;
  duplicates: Duplicate[];
  problems: string[];
}

interface 스캔기록 {
  scannedAt: string;
  서비스별: Map<string, 서비스결과>;
  // 서비스를 훑기도 전에 깨진 사유. 어느 서비스 것도 아니라 누구에게나 보인다
  깨짐?: string;
}

let last: 스캔기록 | null = null;
// 기동 시 스캔이 아직 안 끝났는데 화면이 결과를 물어볼 수 있다. 그때는 이 약속을 기다린다
let startup: Promise<스캔기록> | null = null;

async function runScan(log: FastifyBaseLogger): Promise<스캔기록> {
  const scannedAt = new Date().toISOString();
  const 서비스별 = new Map<string, 서비스결과>();

  try {
    // 서비스마다 자기 폴더만 훑는다. 다른 서비스의 폴더는 보지 않는다 (SPEC §9.2).
    // 서비스가 하나도 없으면 훑을 폴더가 없다 — 첫 서비스는 설정에서 만든다 (§8.8)
    const services = await activeServices();
    const root = testsRoot();

    for (const service of services) {
      const 결과: 서비스결과 = { added: 0, updated: 0, deactivated: 0, duplicates: [], problems: [] };
      서비스별.set(service.prefix, 결과);
      const 어디 = (file: string): string => join(service.testsDir, file);

      // 지도 ① 은 케이스 파일이 아니라 요구사항 표에서 온다 — 케이스 폴더가 깨지거나 번호가 겹쳐도 따로 갱신한다.
      // 표를 못 읽으면 옛 지도를 남기고 문제로만 알린다 (카탈로그 §3.1 「지도」)
      try {
        await 지도채우기(service.id, service.prefix);
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 요구사항 표로 지도를 채우지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 폴더가 아직 안 채워졌거나 이름이 틀리면 여기서 던진다. 그 서비스만 접고 나머지는 계속 훑는다 —
      // 한 서비스 때문에 다른 서비스의 케이스까지 사라지면 목록이 통째로 거짓말을 한다 (SPEC §3.1)
      let found;
      try {
        found = await scan(join(root, service.testsDir));
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 테스트 폴더 ${service.testsDir}을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      결과.duplicates.push(...found.duplicates.map((d) => ({ tcId: d.tcId, files: d.files })));
      결과.problems.push(
        ...found.duplicates.map((d) => `tcId ${d.tcId}이 ${d.files[0]}와 ${d.files[1]}에 겹쳐 있다`),
        ...found.failures.map((f) => `${어디(f.file)}을 읽지 못했다: ${f.message}`),
      );

      // 폴더에 남의 접두사가 섞여 있으면 걸러 낸다. 그 케이스의 주인은 다른 서비스다 (SPEC §9.2)
      const 제것인가 = (tcId: string): boolean => tcId.startsWith(`${service.prefix}-`);
      const 내것 = found.specs.filter((s) => 제것인가(s.tcId));
      for (const 남 of found.specs.filter((s) => !제것인가(s.tcId))) {
        결과.problems.push(`${남.filePath}의 ${남.tcId}은 ${service.prefix} 서비스의 접두사가 아니라 걸러 냈다`);
      }

      // 중복은 그 서비스의 스캔 실패다. 어느 쪽이 진짜인지 모르는 채로 캐시를 덮어쓰면
      // 목록이 거짓말을 한다 (SPEC §3.1). 다른 서비스까지 버리지는 않는다
      if (found.duplicates.length > 0) continue;

      // 읽지 못한 파일이 있으면 무엇이 정말 사라졌는지 가릴 수 없다. 비활성 처리는 건너뛰고 읽은 것만 갱신한다
      const saved = await save(내것, found.failures.length === 0, service.prefix);
      결과.added = saved.added;
      결과.updated = saved.updated;
      결과.deactivated = saved.deactivated;

      // 지도 ② 는 케이스 파일에서 오므로 저장한 뒤에 채운다 — 표가 케이스를 외래 키로 건다
      try {
        await 화면지도채우기(service.id, service.prefix, root, 내것);
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 화면 파일로 지도를 채우지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const problems = [...서비스별.values()].flatMap((r) => r.problems);
    if ([...서비스별.values()].some((r) => r.duplicates.length > 0)) log.error(`[catalog] 스캔 실패 — ${problems.join(' / ')}`);
    else if (problems.length > 0) log.warn(`[catalog] 스캔 일부 실패 — ${problems.join(' / ')}`);
    last = { scannedAt, 서비스별 };
    return last;
  } catch (err) {
    // 기동 시 스캔이 깨져도 admin은 떠야 한다. 사유만 마지막 결과에 남긴다 (SPEC §3.1)
    const message = err instanceof Error ? err.message : String(err);
    last = { scannedAt, 서비스별, 깨짐: message };
    log.error(`[catalog] 스캔이 깨졌다: ${message}`);
    return last;
  }
}

/**
 * 부른 사람이 케이스 `read` 인 서비스 것만 합친다 (SPEC 도메인/인증 §7). admin 은 살아 있는 서비스 전부다 —
 * 배정 없이 스캔하는 admin 이 결과를 못 보면 설치 직후 첫 스캔이 빈칸이 된다.
 * 사람이 없으면(문 없이 띄운 자리) 아무 서비스도 안 보인다. 모르면 막는다
 */
function 보이는결과(기록: 스캔기록, user: 사용자 | null): LastScan {
  const 보이는곳 =
    user?.role === 'admin' ? null : new Set(칸되는서비스(user?.services ?? [], 'cases', 'read'));
  const 고른것 = [...기록.서비스별].filter(([prefix]) => 보이는곳 === null || 보이는곳.has(prefix)).map(([, r]) => r);
  const duplicates = 고른것.flatMap((r) => r.duplicates);
  const problems = [...(기록.깨짐 === undefined ? [] : [기록.깨짐]), ...고른것.flatMap((r) => r.problems)];
  const error = problems.length > 0 ? problems.join('\n') : undefined;
  const scannedAt = 기록.scannedAt;

  // 겹친 번호가 하나라도 보이면 옛 모양 그대로 건수 0 과 오류로 알린다 (SPEC §3.1)
  if (duplicates.length > 0) return { scannedAt, added: 0, updated: 0, deactivated: 0, duplicates, error };
  const 합 = (칸: 'added' | 'updated' | 'deactivated'): number => 고른것.reduce((n, r) => n + r[칸], 0);
  return { scannedAt, added: 합('added'), updated: 합('updated'), deactivated: 합('deactivated'), duplicates: [], error };
}

// **배정은 여기서 안 본다. 문(auth/gate.ts)이 이미 막았다** — 이 요청이 여기 닿았다는 것은
// `?service=` 가 부른 사람의 배정 목록에 들어 있다는 뜻이다 (SPEC §7 「서비스 경계도 여기서 막는다」).
// 여기서 보는 것은 **그 접두사의 서비스가 실재하고 살아 있는가** 하나뿐이다.
//
// 2026-09-19 까지 이 주석이 「WS-F가 안을 채운다」였다. 안 채워졌고, 그래서 **활성 서비스면
// 전부 통과**시키면서 이름만 배정 검사였다. 문이 먼저 막으므로 뚫리지는 않았지만
// 다음 사람이 이 함수를 믿고 새 라우트에 붙이면 그 라우트는 검사받지 않는다 (spec-review C4)
async function 실재하는서비스인가(prefix: string): Promise<boolean> {
  return (await findService(prefix)) !== null;
}

// 모르는 값은 거르지 않는다 — 실행 목록의 `?kind=` 와 같은 관례다 (카탈로그 §7 · PR #132)
export function 종류읽기(값: string | undefined): 'UI' | 'FN' | undefined {
  return 값 === 'ui' ? 'UI' : 값 === 'fn' ? 'FN' : undefined;
}

// 빈 값은 거르지 않는다. 모르는 값은 null — `?kind=` 와 달리 이 조건을 보내는 옛 화면이 없고,
// 거르지 않고 전부 내면 거른 줄 알고 틀린 목록을 믿는다 (카탈로그 §7)
export function 기법읽기(값: string | undefined): Technique | 'none' | undefined | null {
  if (값 === undefined || 값 === '') return undefined;
  if (값 === 'none') return 'none';
  return TECHNIQUES.find((t) => t === 값) ?? null;
}

const 모르는기법 = (값: string | undefined) => ({ error: 'BAD_TECHNIQUE', detail: `설계 기법 목록에 없는 값입니다 — ${String(값)}` });

export default async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // 배포는 컨테이너 재기동이다. 뜨는 김에 한 번 훑어 두면 배포 직후 목록이 최신이 된다 (SPEC §3.1)
  startup = runScan(app.log);

  app.post('/catalog/scan', async (req) => 보이는결과(await runScan(app.log), req.user));

  app.get('/catalog/scan', async (req) => {
    const 기록 = last ?? (startup === null ? null : await startup);
    return 기록 === null ? null : 보이는결과(기록, req.user);
  });

  app.get<{
    Querystring: { service?: string; q?: string; platform?: string; active?: string; page?: string; kind?: string; technique?: string };
  }>(
    '/catalog/cases',
    async (req, reply) => {
      const service = req.query.service ?? '';
      // 서비스는 검색 조건이 아니라 맨 위 띠의 선택이고 서버가 늘 적용한다 (SPEC §8 · §8.1)
      if (service === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
      if (!(await 실재하는서비스인가(service))) {
        // 404로 감추지 않는다. 화면이 그 자리를 아예 안 보여주므로 여기까지 닿은 요청은
        // 화면의 버그이거나 직접 찌른 것이고, 둘 다 감추는 편이 더 나쁘다 (SPEC §3.5)
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: service });
      }
      const technique = 기법읽기(req.query.technique);
      if (technique === null) return reply.code(400).send(모르는기법(req.query.technique));

      const platform = req.query.platform;
      return listCases({
        service,
        q: req.query.q ?? '',
        platform: platform === 'desktop' || platform === 'mobile' ? platform : undefined,
        activeOnly: req.query.active !== 'false',
        kind: 종류읽기(req.query.kind),
        technique,
        page: Math.max(1, Number(req.query.page ?? 1) || 1),
        pageSize: PAGE_SIZE,
      });
    },
  );

  app.get<{ Querystring: { service?: string; q?: string; platform?: string; active?: string; kind?: string; technique?: string } }>(
    '/catalog/export',
    async (req, reply) => {
      const service = req.query.service ?? '';
      if (service === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
      const 서비스 = await findService(service);
      if (서비스 === null) return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: service });
      const technique = 기법읽기(req.query.technique);
      if (technique === null) return reply.code(400).send(모르는기법(req.query.technique));

      // 문은 (케이스, read) 만 봤다. 실행·작성 기록은 그 칸이 따로 있어야 싣는다 — 케이스 read 만으로 새면 안 된다 (카탈로그 §7)
      const 되나 = (기능: 'runs' | 'authoring'): boolean =>
        칸되는서비스(req.user?.services ?? [], 기능, 'read').includes(service);
      const platform = req.query.platform;
      const 자료 = await 엑셀자료({
        service,
        serviceId: 서비스.id,
        q: req.query.q ?? '',
        platform: platform === 'desktop' || platform === 'mobile' ? platform : undefined,
        activeOnly: req.query.active !== 'false',
        kind: 종류읽기(req.query.kind),
        technique,
        canSeeRuns: 되나('runs'),
        canSeeAuthoring: 되나('authoring'),
      });
      const 날짜 = 한국시각(자료.generatedAt).slice(0, 10);
      // UI · 기능을 따로 받으면 이름이 같아 덮어쓴다 — 종류를 이름에 넣는다 (PR #132)
      const 종류 = 종류읽기(req.query.kind);
      const 꼬리 = 종류 === undefined ? '' : `-${종류}`;
      // 옛 브라우저용 ASCII 이름을 앞에 두고 한글 이름은 RFC 5987 로 싣는다 (authoring/assets.ts 머리글이름과 같은 인코딩)
      const 한글 = encodeURIComponent(`${service}-테스트케이스${꼬리}-${날짜}.xlsx`).replace(
        /['()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      return reply
        .header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('content-disposition', `attachment; filename="${service}-testcases${꼬리}-${날짜}.xlsx"; filename*=UTF-8''${한글}`)
        .send(await renderCatalogXlsx(자료));
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
