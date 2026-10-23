// 카탈로그 컨텍스트의 HTTP 라우트 (SPEC §7 Catalog)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { type Platform, TECHNIQUES, type Technique } from '@platform/kit/types';

import { 칸되는서비스 } from '../auth/permissions.js';
import { 맥락조건읽기, 모르는종류, type 맥락글 } from './context.js';
import { renderCatalogXlsx } from './export.js';
import { 엑셀자료, 한국시각 } from './exportData.js';
import { 기기별결과, 마지막읽기, 모르는마지막, 판정으로 } from './last.js';
import { 기동훑기, 마지막보기, 훑고보기 } from './scanRun.js';
import { readExcerpt } from './source.js';
import { findCase, findService, listCases } from './store.js';

const PAGE_SIZE = 50;

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

// 1 · 0 만 받고 그 밖은 조용히 버린다 — technique · last 와 달리 모르는 값에 오류를 내지 않는다 (카탈로그 §7 `?smoke=`)
export function 스모크읽기(값: string | undefined): boolean | undefined {
  return 값 === '1' ? true : 값 === '0' ? false : undefined;
}

const 모르는기법 = (값: string | undefined) => ({ error: 'BAD_TECHNIQUE', detail: `설계 기법 목록에 없는 값입니다 — ${String(값)}` });

// 기법과 같은 까닭으로 모르는 값은 null — 예전에는 조용히 빼서 `?platform=android` 가 웹 케이스까지 냈다 (카탈로그 §7 · APP-F1-04)
const 디바이스들: readonly Platform[] = ['desktop', 'mobile', 'android'];
export function 디바이스읽기(값: string | undefined): Platform | undefined | null {
  if (값 === undefined || 값 === '') return undefined;
  return 디바이스들.find((p) => p === 값) ?? null;
}

const 모르는디바이스 = (값: string | undefined) => ({ error: 'BAD_PLATFORM', detail: `디바이스는 desktop · mobile · android 중 하나입니다 — ${String(값)}` });

export default async function catalogRoutes(app: FastifyInstance): Promise<void> {
  기동훑기(app.log);

  // `?service=` — 목록 화면이 지금 보는 서비스. 비면 볼 수 있는 서비스 전부다 (카탈로그 §7 · PRD-F9-19)
  app.post<{ Querystring: { service?: string } }>('/catalog/scan', async (req) => 훑고보기(app.log, req.user, req.query.service || undefined));

  app.get<{ Querystring: { service?: string } }>('/catalog/scan', async (req) => 마지막보기(req.user, req.query.service || undefined));

  app.get<{
    Querystring: { service?: string; q?: string; platform?: string; active?: string; page?: string; kind?: string; technique?: string; last?: string; smoke?: string } & 맥락글;
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
      const 맥락 = 맥락조건읽기(req.query);
      if (맥락 === null) return reply.code(400).send(모르는종류(req.query.axis));
      const last = 마지막읽기(req.query.last);
      if (last === null) return reply.code(400).send(모르는마지막(req.query.last));
      const platform = 디바이스읽기(req.query.platform);
      if (platform === null) return reply.code(400).send(모르는디바이스(req.query.platform));

      // 판정은 (실행, read) 몫이다 — 없으면 last 를 무시하고 셈도 안 낸다. 엑셀이 그 칸을 비우는 것과 같은 까닭 (카탈로그 §7)
      const 결과본다 = 칸되는서비스(req.user?.services ?? [], 'runs', 'read').includes(service);
      return listCases({
        ...맥락,
        service,
        q: req.query.q ?? '',
        platform,
        activeOnly: req.query.active !== 'false',
        kind: 종류읽기(req.query.kind),
        technique,
        smoke: 스모크읽기(req.query.smoke),
        마지막: 결과본다 ? { 판정: 판정으로(await 기기별결과(service)), last } : undefined,
        page: Math.max(1, Number(req.query.page ?? 1) || 1),
        pageSize: PAGE_SIZE,
      });
    },
  );

  app.get<{ Querystring: { service?: string; q?: string; platform?: string; active?: string; kind?: string; technique?: string; last?: string } & 맥락글 }>(
    '/catalog/export',
    async (req, reply) => {
      const service = req.query.service ?? '';
      if (service === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
      const 서비스 = await findService(service);
      if (서비스 === null) return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: service });
      const technique = 기법읽기(req.query.technique);
      if (technique === null) return reply.code(400).send(모르는기법(req.query.technique));
      const 맥락 = 맥락조건읽기(req.query);
      if (맥락 === null) return reply.code(400).send(모르는종류(req.query.axis));
      const last = 마지막읽기(req.query.last);
      if (last === null) return reply.code(400).send(모르는마지막(req.query.last));
      const platform = 디바이스읽기(req.query.platform);
      if (platform === null) return reply.code(400).send(모르는디바이스(req.query.platform));

      // 문은 (케이스, read) 만 봤다. 실행·작성 기록은 그 칸이 따로 있어야 싣는다 — 케이스 read 만으로 새면 안 된다 (카탈로그 §7)
      const 되나 = (기능: 'runs' | 'authoring'): boolean =>
        칸되는서비스(req.user?.services ?? [], 기능, 'read').includes(service);
      const 자료 = await 엑셀자료({
        ...맥락,
        service,
        serviceId: 서비스.id,
        q: req.query.q ?? '',
        platform,
        activeOnly: req.query.active !== 'false',
        kind: 종류읽기(req.query.kind),
        technique,
        last,
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

  // null 은 코드 값으로 되돌리기. 비활성 케이스도 고친다 — 다음 스캔에 살아날 수 있다
  app.put<{ Params: { tcId: string } }>('/cases/:tcId/smoke', async (req, reply) => {
    const parsed = z.object({ smoke: z.boolean().nullable() }).strict().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    const { pool } = await import('../db/index.js');
    const r = await pool.query('UPDATE test_case SET smoke_set = $2 WHERE tc_id = $1', [req.params.tcId, parsed.data.smoke]);
    if (r.rowCount === 0) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.params.tcId });
    return reply.code(204).send();
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
