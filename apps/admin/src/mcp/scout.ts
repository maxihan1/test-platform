// Scout 챗봇이 쓰는 MCP 도구 다섯의 등록과 결과 도구 넷(실행 기록 검색 · E2E · 호환성 · 성능 결과 — 최근 이슈는 tools.ts). 화면이 읽는 함수를 감싸고 같은 통로 칸으로 문판정을 부른다 (도메인/챗봇 §3.14 · 도메인/BTS §7 「MCP」)

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { 문판정 } from '../auth/gate.js';
import { 필요권한 } from '../auth/routeTable.js';
import { 서비스없음, 자원의서비스 } from '../auth/scope.js';
import type { 사용자 } from '../auth/store.js';
import type { 부르기함수 } from '../bts/client.js';
import { 호환성결과 } from '../compat/runView.js';
import { listRuns } from '../execution/queries.js';
import { 기기줄들 } from '../perf/deviceStats.js';
import { 줄읽기 } from '../perf/deviceStore.js';
import { 페이지줄읽기 } from '../perf/pages.js';
import { 성능실행머리, 성능실행목록 } from '../perf/runs.js';
import type { DeviceRunConfig, PageRunConfig } from '../perf/types.js';
import { 시나리오결과 } from '../scenario/runRoutes.js';
import { 카드요약 } from '../web/scenarioView.js';
import { 글답, 글상한, 막힘, 문막힘, 없음, 자르기, 쪽, 최근이슈, 최대줄, type 도구답 } from './tools.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

export const 실행종류들 = ['UI', 'FN', 'SCENARIO', 'COMPAT', 'PERF_LOAD', 'PERF_PAGE', 'PERF_DEVICE'] as const;
export type 실행종류 = (typeof 실행종류들)[number];
// 성능 실행 목록 통로가 200개까지만 준다 — 그보다 깊은 쪽은 섞은 차례가 틀어져 여기서 끊는다 (6쪽 × 30 = 180)
export const 실행목록최대쪽 = 5;
// 성능 분석 글 상한 — 다른 긴 글처럼 판단에 쓰는 머리만
const AI글상한 = 2000;

type 목록줄 = { kind: 실행종류; runId: number; title: string; serviceName: string; status: string; env: string | null; startedAt: string | null; finishedAt: string | null; summary: unknown };

const 시각 = (v: Date | string | null): string | null => (v === null ? null : new Date(v).toISOString());

/**
 * 실행 기록 검색 — 프로젝트 애플리케이션들의 최근 실행을 일곱 종류 섞어 시작 시각 늦은 것부터 30줄.
 * 애플리케이션마다 그 종류의 목록 통로(GET /api/runs · GET /api/perf/runs)가 요구하는 칸이 있는 것만 섞는다
 */
export async function 실행목록(사람: 사용자, projectId: number, kind?: 실행종류, page = 0): Promise<도구답> {
  const 앱들 = 사람.services.filter((s) => s.projectId === projectId);
  const 열림 = (통로: string, prefix: string) => 문판정(사람, 필요권한(통로, 'GET'), [prefix]) === null;
  const 실행앱 = 앱들.filter((s) => 열림('/api/runs', s.prefix));
  const 성능앱 = 앱들.filter((s) => 열림('/api/perf/runs', s.prefix));
  if (실행앱.length === 0 && 성능앱.length === 0) return 막힘(`project ${String(projectId)}`);

  // 한 종류 목록마다 이 쪽 끝까지만 읽는다. 하나 더 읽어 넘쳤는지 안다
  const 몇 = (page + 1) * 최대줄 + 1;
  const 고름 = (k: 실행종류) => kind === undefined || kind === k;
  const 묶음: Promise<목록줄[]>[] = [];
  // ponytail: 화면 목록 함수를 그대로 써서 집계 · 직전 대비까지 같이 센다. 느려지면 머리 칸만 읽는 질의를 따로 둔다
  for (const s of 실행앱) {
    if (고름('UI') || 고름('FN')) {
      const 종류 = kind === 'UI' ? 'ui' : kind === 'FN' ? 'fn' : 'case';
      묶음.push(listRuns(s.prefix, 1, 몇, { kind: 종류 }).then((r) => r.items.map((x) => ({ ...머리(x), kind: x.kind, summary: x.counts }))));
    }
    if (고름('SCENARIO')) {
      묶음.push(
        listRuns(s.prefix, 1, 몇, { kind: 'scenario' }).then((r) =>
          r.items.map((x) => ({ ...머리(x), kind: 'SCENARIO' as const, summary: { verdict: x.verdict, partCount: x.partCount, stoppedAt: x.stoppedAt, unconfirmed: x.unconfirmed } })),
        ),
      );
    }
    if (고름('COMPAT')) {
      묶음.push(listRuns(s.prefix, 1, 몇, { kind: 'compat' }).then((r) => r.items.map((x) => ({ ...머리(x), kind: 'COMPAT' as const, summary: x.compat }))));
    }
  }
  const 성능종류 = kind?.startsWith('PERF_') === true ? kind.slice('PERF_'.length) : null;
  if (kind === undefined || 성능종류 !== null) {
    for (const s of 성능앱) {
      묶음.push(
        성능실행목록(s.id, 성능종류, null, 몇).then((줄) =>
          줄.map((x) => ({
            kind: `PERF_${x.kind}` as 실행종류,
            runId: x.id,
            title: x.title,
            serviceName: s.name,
            status: x.status,
            env: x.env,
            startedAt: 시각(x.startedAt),
            finishedAt: null,
            // 실행 기록 줄이 보이는 숫자 그대로 — 부하는 summary 칸, 페이지 · 기기는 measures 칸
            summary: { verdict: x.verdict, measures: x.kind === 'LOAD' ? x.summary : x.measures },
          })),
        ),
      );
    }
  }
  const 전부 = (await Promise.all(묶음)).flat();
  // 대기 중인 성능 실행은 시작 시각이 없다 — 막 만든 것이라 맨 위에 둔다
  전부.sort((a, b) => (b.startedAt ?? '9999').localeCompare(a.startedAt ?? '9999'));
  const runs = 전부.slice(page * 최대줄, (page + 1) * 최대줄);
  // 성능 목록 통로에는 끝난 시각이 없다 — 실린 줄만 표에서 읽어 채운다
  const 성능번호 = runs.filter((r) => r.kind.startsWith('PERF_')).map((r) => r.runId);
  if (성능번호.length > 0) {
    const 끝 = await (await db()).query<{ id: string; finished_at: Date | null }>('SELECT id, finished_at FROM perf_run WHERE id = ANY($1)', [성능번호]);
    const 끝난때 = new Map(끝.rows.map((r) => [Number(r.id), 시각(r.finished_at)]));
    for (const r of runs) if (r.kind.startsWith('PERF_')) r.finishedAt = 끝난때.get(r.runId) ?? null;
  }
  return { ok: true, data: { runs, ...(전부.length > (page + 1) * 최대줄 && { truncated: true }) } };
}

const 머리 = (x: { runId: number; title: string; serviceName: string; status: string; env: string; startedAt: string; finishedAt: string | null }) => ({
  runId: x.runId,
  title: x.title,
  serviceName: x.serviceName,
  status: x.status,
  env: x.env,
  startedAt: x.startedAt,
  finishedAt: x.finishedAt,
});

/** 번호 하나짜리 결과 도구의 문 — 그 실행의 애플리케이션을 찾아 화면 통로와 같은 칸으로 판정한다. 통과면 null */
async function 번호문(사람: 사용자, 종류: '실행' | '성능실행', runId: number, 통로: string): Promise<도구답 | null> {
  const 서비스 = await 자원의서비스({ 종류, 번호: runId });
  if (서비스 === 서비스없음) return 막힘(String(runId));
  if (서비스 === null) return 없음(String(runId));
  const 판정 = 문판정(사람, 필요권한(통로, 'GET'), [서비스]);
  return 판정 === null ? null : 문막힘(판정);
}

/** E2E 결과 — GET /api/runs/:runId/scenario 의 가린 몸에서 부품마다 판정과 실패 한 줄만. 절차 · trace · bound · 사진은 싣지 않는다 */
export async function E2E결과(사람: 사용자, runId: number): Promise<도구답> {
  const 문 = await 번호문(사람, '실행', runId, '/api/runs/:runId/scenario');
  if (문 !== null) return 문;
  const 본것 = await 시나리오결과(runId);
  if (본것 === null) return 없음(`${String(runId)} 은 E2E 실행이 아니다`);
  return {
    ok: true,
    data: {
      runId,
      title: 본것.title,
      status: 본것.status,
      env: 본것.env,
      startedAt: 본것.startedAt,
      finishedAt: 본것.finishedAt,
      parts: 본것.parts.slice(0, 최대줄).map((p) => ({
        seq: p.seq,
        kind: p.kind,
        tcId: p.tcId,
        // 케이스 부품은 케이스 이름(지워져 이름이 없으면 번호), API · 대기 · 모킹 부품은 조립 화면 카드 글
        name: p.tcName ?? (p.kind === 'case' ? p.tcId : 카드요약(p.part, undefined, 'ko')),
        status: p.status,
        durationMs: p.durationMs,
        failure: p.failure,
      })),
      ...(본것.parts.length > 최대줄 && { truncated: true }),
    },
  };
}

/** 호환성 결과 — GET /api/compat-runs/:runId 의 요약. 칸 · 카드는 30줄, 의심 설명은 500자. 사진은 싣지 않는다 */
export async function 호환성결과보기(사람: 사용자, runId: number): Promise<도구답> {
  const 문 = await 번호문(사람, '실행', runId, '/api/compat-runs/:runId');
  if (문 !== null) return 문;
  // 요약만 — 미커버 화면 셈은 이 도구가 안 싣는다
  const 결과 = await 호환성결과(runId, new Map(), true);
  if (결과 === null) return 없음(`${String(runId)} 은 호환성 실행이 아니다`);
  return {
    ok: true,
    data: {
      runId,
      title: 결과.run.title,
      status: 결과.run.state,
      startedAt: 결과.run.startedAt,
      finishedAt: 결과.run.finishedAt,
      counts: 결과.counts,
      devices: 결과.devices.map((d) => ({ seq: d.seq, name: d.name, fold: d.fold, state: d.state, skipReason: d.skipReason })),
      rows: 결과.rows.slice(0, 최대줄).map((r) => ({ key: r.key, name: r.name, cells: r.cells })),
      cards: 결과.cards.slice(0, 최대줄).map((c) => ({ key: c.key, seq: c.seq, issues: c.issues.map((i) => ({ kind: i.kind, note: 자르기(i.note, 글상한.오류) })), verdict: c.verdict })),
      ...((결과.rows.length > 최대줄 || 결과.cards.length > 최대줄) && { truncated: true }),
    },
  };
}

type 목표 = { metric: string; scope?: string; op?: string; value?: number; measured?: number | null; verdict?: string };

/** 성능 결과 — 결과 화면 머리의 숫자와 기준 넘은 목표 · AI 분석 글, 페이지는 페이지마다 지표, 기기는 디바이스마다 요약. 1초 숫자 · 사진 · 영상은 화면 링크로 */
export async function 성능결과(사람: 사용자, runId: number): Promise<도구답> {
  const 문 = await 번호문(사람, '성능실행', runId, '/api/perf/runs/:id');
  if (문 !== null) return 문;
  const run = await 성능실행머리(runId);
  if (run === undefined) return 없음(String(runId));
  const 행 = run as { kind: 'LOAD' | 'PAGE' | 'DEVICE'; config: unknown };
  const ai = run.ai as { title?: unknown; items?: unknown } | null;
  const 머리칸 = {
    runId,
    kind: 행.kind,
    title: run.scenarioName,
    status: run.status,
    verdict: run.verdict,
    stopReason: run.stopReason,
    env: run.env,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    summary: run.summary,
    // 판정 전(도는 중 · 멈춤)의 목표는 verdict 가 없다 — 넘은 것만 싣는다
    targets: ((run.targets ?? []) as 목표[]).filter((t) => t.verdict === 'FAIL'),
    ai: ai === null ? null : 자르기(JSON.stringify({ title: ai.title, items: ai.items }), AI글상한),
    link: `#/perf/runs/${String(runId)}`,
  };
  if (행.kind === 'PAGE') {
    const 줄 = await 페이지줄읽기(runId, (행.config as unknown as PageRunConfig).pages);
    return {
      ok: true,
      data: {
        ...머리칸,
        pages: 줄.slice(0, 최대줄).map((p) => ({ url: p.url, name: p.name, device: p.device, network: p.network, lcpMs: p.lcpMs, fcpMs: p.fcpMs, cls: p.cls, ttfbMs: p.ttfbMs, verdict: p.verdict })),
        ...(줄.length > 최대줄 && { truncated: true }),
      },
    };
  }
  if (행.kind === 'DEVICE') {
    const 줄들 = await 줄읽기(runId);
    const 기기별 = (행.config as unknown as DeviceRunConfig).devices.map((d) => ({ d, 줄: 줄들.filter((r) => r.serial === d.serial) }));
    const 실행 = { status: String(run.status), targets: run.targets as { scope: string; verdict: string }[] | null };
    return { ok: true, data: { ...머리칸, devices: 기기줄들(기기별, 실행).slice(0, 최대줄), ...(기기별.length > 최대줄 && { truncated: true }) } };
  }
  return { ok: true, data: 머리칸 };
}

/** Scout 가 더한 도구 다섯을 붙인다 — 자동 AI(mcj_)와 사람에게도 같이 열린다. authSub · 부르기는 bts_search 와 같다 (server.ts 서버세우기) */
export function Scout도구등록(서버: McpServer, 사람: 사용자, authSub: string | null, 부르기?: 부르기함수): void {
  const 읽기만 = { readOnlyHint: true, openWorldHint: false } as const;
  const 번호 = z.number().int().positive();

  서버.registerTool(
    'run_list',
    {
      description: `실행 기록 검색 — 프로젝트 애플리케이션들의 최근 실행을 일곱 종류(UI · FN · SCENARIO · COMPAT · PERF_LOAD · PERF_PAGE · PERF_DEVICE) 섞어 시작 시각 늦은 것부터 30줄. 줄마다 kind · runId · 제목 · 애플리케이션 · 상태 · 대상 서버 · 시각과 목록 화면 숫자(summary). kind 로 한 종류만 고른다. 다음이 있으면 truncated — page 를 올린다(${String(실행목록최대쪽)} 까지 — 그 쪽에서도 truncated 면 더 오래된 실행은 실행 기록 화면에서 본다). 실행 하나는 kind 에 맞는 결과 도구로 본다`,
      inputSchema: {
        projectId: 번호.describe('Test Commander 프로젝트 번호'),
        kind: z.enum(실행종류들).optional(),
        page: z.number().int().min(0).max(실행목록최대쪽).optional().describe('0 부터. 잘린 목록의 다음 30줄'),
      },
      annotations: 읽기만,
    },
    async ({ projectId, kind, page }) => 글답(await 실행목록(사람, projectId, kind, page)),
  );

  서버.registerTool(
    'e2e_result',
    {
      description: 'E2E 실행 하나의 결과 — 실행 머리와 부품마다 seq · 종류 · 케이스 번호 · 이름 · 판정 · 걸린 시간 · 실패 유형과 한 줄 까닭(30줄 — 넘으면 truncated). 절차 · 사진은 싣지 않는다. E2E 가 아닌 실행 번호는 NOT_FOUND',
      inputSchema: { runId: 번호.describe('run_list 의 kind 가 SCENARIO 인 runId') },
      annotations: 읽기만,
    },
    async ({ runId }) => 글답(await E2E결과(사람, runId)),
  );

  서버.registerTool(
    'compat_result',
    {
      description: '호환성 실행 하나의 결과 — 머리 숫자(counts) · 디바이스 상태마다 이름 · 접힘 · 상태 · 건너뛴 까닭 · 이상 있는 화면 칸(rows) · 의심 카드(cards — 의심 종류 · 설명 500자 · 사람 판정). rows · cards 는 30줄(넘으면 truncated). 사진은 싣지 않는다. 호환성이 아닌 실행 번호는 NOT_FOUND',
      inputSchema: { runId: 번호.describe('run_list 의 kind 가 COMPAT 인 runId') },
      annotations: 읽기만,
    },
    async ({ runId }) => 글답(await 호환성결과보기(사람, runId)),
  );

  서버.registerTool(
    'perf_result',
    {
      description: '성능 실행 하나의 결과 — 종류 · 상태 · 판정 · 멈춘 까닭 · 숫자 요약(p95 · 오류율 · 처리량) · 기준을 넘은 목표 · AI 분석 글(2,000자). 페이지 측정은 페이지마다 지표(pages), 기기 측정은 디바이스마다 요약(devices)을 더한다(30줄). 1초 숫자 · 사진 · 영상은 결과 화면 링크(link)로 본다',
      inputSchema: { runId: 번호.describe('run_list 의 kind 가 PERF_ 로 시작하는 runId — 성능 실행 번호는 따로 센다') },
      annotations: 읽기만,
    },
    async ({ runId }) => 글답(await 성능결과(사람, runId)),
  );

  서버.registerTool(
    'issue_list',
    {
      description: '그 프로젝트가 이은 Issue Bunker 의 최근 이슈 — 만든 시각 늦은 것부터 키 · 제목 · 상태 · 만든 시각 30줄(닫힌 것도 · 다음이 있으면 truncated — page 를 올린다). 본문 · 댓글은 bts_search 에 issueKey 를 넣어 읽는다. Issue Bunker 를 부르는 계정은 bts_search 와 같다',
      inputSchema: { projectId: 번호.describe('Test Commander 프로젝트 번호'), page: 쪽 },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ projectId, page }) => 글답(await 최근이슈(사람, authSub, projectId, page, 부르기)),
  );

}
