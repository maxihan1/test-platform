// E2E AI 흐름 후보 일 — 재료 모으기 · 맡기기 · 작성 에이전트 꺼짐 · 오래된 일 닫기 · 결과 다듬기 · 결과 보기 (도메인/시나리오 §3.7 결정 15 · §7 「마법사 통로」)
// 일 표 · 집기 · 끝 알리기는 성능 AI 일 그대로다(perf/ai.ts) — 여기는 흐름 후보만의 규칙을 둔다

import type { Platform } from '@platform/kit';

import { tcId종류 } from '../catalog/rules.js';
import { 맥락읽기 } from '../catalog/contextRead.js';
import { 오래된일닫기, 일만들기, 일하나 } from '../perf/ai.js';
import { 지금판 } from '../prd/store.js';
import { db } from '../settings/store.js';

import { type AI후보, 재료짓기, 흐름다듬기, type 흐름재료, type 흐름후보 } from './flowSuggest.js';
import { 제안재료읽기 } from './linkSuggest.js';
import { 화면연결들 } from './next.js';

// 에이전트는 일이 없으면 5초마다 집으러 온다(scripts/authoring-perf.ts). 1분 못 받으면 꺼졌다고 본다
const 꺼짐초 = 60;
// 맡긴 뒤 에이전트가 꺼졌으면 대기 일을 이만큼 기다리고 닫는다
const 대기닫기분 = 2;

// ponytail: admin 메모리 — admin 이 다시 켜지면 첫 집기(길어야 5초)까지 「꺼짐」이다(§3.7 결정 15 「남는 한계」)
let 마지막집기: { at: number; 접두사들: Set<string> } | null = null;

/** 작성 에이전트 계정이 집으러 왔다. 그 계정이 배정된 애플리케이션만 집으므로 접두사를 같이 적는다 */
export function 집기왔다(접두사들: readonly string[], 지금 = Date.now()): void {
  마지막집기 = { at: 지금, 접두사들: new Set(접두사들) };
}

/** 검사가 admin 다시 켜짐을 흉내 낸다 */
export function 집기기록지우기(): void {
  마지막집기 = null;
}

/** 그 애플리케이션 일을 집을 에이전트가 없다. 집힌 일이 도는 중이면 에이전트가 바빠 집기가 늦을 뿐이다 */
export async function 꺼졌나(prefix: string, 지금 = Date.now()): Promise<boolean> {
  // 다시 켜진 admin 은 배정을 모른다 — 집힌 일이 돌면 바쁜 에이전트로 보고, 아니면 첫 집기까지 꺼짐이다
  if (마지막집기 !== null && !마지막집기.접두사들.has(prefix)) return true;
  if (마지막집기 !== null && 지금 - 마지막집기.at <= 꺼짐초 * 1000) return false;
  // 녹화를 기다리는 성능 일은 집히기 전에도 RUNNING 이라 세지 않는다
  const r = await (await db()).query("SELECT 1 FROM perf_ai_job WHERE status = 'RUNNING' AND claimed_at IS NOT NULL LIMIT 1");
  return r.rowCount === 0;
}

/** 집고 오래 쥔 일과, 꺼진 에이전트를 기다리는 흐름 추천 대기 일을 닫는다. 집기 · 맡기기 · 결과 보기 때마다 부른다 */
export async function 흐름일닫기(): Promise<void> {
  await 오래된일닫기();
  const pool = await db();
  const r = await pool.query<{ id: string; prefix: string }>(
    `SELECT j.id, s.prefix FROM perf_ai_job j JOIN service s ON s.id = j.service_id
      WHERE j.kind = 'SUGGEST_FLOWS' AND j.status = 'QUEUED' AND j.created_at < now() - make_interval(mins => $1)`,
    [대기닫기분],
  );
  for (const x of r.rows) {
    if (!(await 꺼졌나(x.prefix))) continue;
    await pool.query(
      `UPDATE perf_ai_job SET status = 'FAILED', error = '작성 에이전트가 꺼져 있다', finished_at = now() WHERE id = $1 AND status = 'QUEUED'`,
      [x.id],
    );
  }
}

/** 시작 애플리케이션 하나의 재료. 케이스 파일 원문 · 화면 기록 원문 · 서비스 가이드는 넣지 않는다 */
async function 재료읽기(서비스: number, prefix: string, platform: Platform, wish: string | null): Promise<흐름재료> {
  const [판, 맥락, 케이스, 연결들] = await Promise.all([
    지금판(서비스),
    맥락읽기(prefix),
    (await db()).query<{ tc_id: string; name: string; platforms: string[]; techniques: string[] }>(
      `SELECT tc_id, name, platforms, techniques FROM test_case WHERE tc_id LIKE $1 AND is_active ORDER BY tc_id COLLATE "C"`,
      [`${prefix}-%`],
    ),
    화면연결들(서비스),
  ]);
  return 재료짓기({
    platform,
    wish,
    prd: (판?.items ?? []).map((i) => ({ reqId: i.reqId, feature: i.feature, text: i.text })),
    케이스들: 케이스.rows.filter((r) => tcId종류(r.tc_id) !== 'UI').map((r) => ({ tcId: r.tc_id, name: r.name, platforms: r.platforms, techniques: r.techniques })),
    맥락,
    PRD씀: [...맥락.values()].some((x) => x.feature !== null),
    연결들,
  });
}

/**
 * 흐름 추천 일을 세운다. 같은 사람 · 애플리케이션 · 디바이스 · 흐름 글의 대기 · 진행 중 일이 있으면 그 번호다 —
 * 「다시 추천받기」를 여러 번 눌러 구독 한도를 쓰지 않게
 */
export async function 흐름맡기기(
  서비스: { id: number; prefix: string },
  platform: Platform,
  wish: string | null,
  who: string,
): Promise<{ jobId: number } | { error: 'AGENT_OFFLINE' | 'NO_DATA' }> {
  await 흐름일닫기();
  if (await 꺼졌나(서비스.prefix)) return { error: 'AGENT_OFFLINE' };
  const 있는 = await (await db()).query<{ id: string }>(
    `SELECT id FROM perf_ai_job
      WHERE kind = 'SUGGEST_FLOWS' AND status IN ('QUEUED', 'RUNNING') AND service_id = $1 AND created_by = $2
        AND input->>'platform' = $3 AND COALESCE(input->>'wish', '') = $4
      ORDER BY id DESC LIMIT 1`,
    [서비스.id, who, platform, wish ?? ''],
  );
  if (있는.rows[0] !== undefined) return { jobId: Number(있는.rows[0].id) };
  const 재료 = await 재료읽기(서비스.id, 서비스.prefix, platform, wish);
  if (재료.cases.length < 2) return { error: 'NO_DATA' };
  return { jobId: await 일만들기('SUGGEST_FLOWS', 서비스.id, 재료, who) };
}

/** 모양을 지난 AI 결과를 다듬는다. 지도는 읽는 사람과 상관없이 다 쓰고, 결과 보기가 (작성, read) 없는 사람에게서 값 연결을 뺀다 */
export async function 흐름결과다듬기(prefix: string, input: unknown, output: Record<string, unknown>): Promise<{ output: { candidates: 흐름후보[] } } | { error: string }> {
  const 재료 = input as 흐름재료;
  const 후보들 = (output as { candidates: AI후보[] }).candidates;
  const { 지도, 입력칸 } = await 제안재료읽기([prefix], 후보들.flatMap((c) => c.tcIds));
  const candidates = 흐름다듬기(재료, 후보들, 지도, 입력칸);
  return candidates.length === 0 ? { error: '쓸 수 있는 흐름 후보가 없다' } : { output: { candidates } };
}

export interface 흐름결과 {
  status: string;
  candidates: 흐름후보[] | null;
  error: string | null;
  material: { reqs: number; cases: number; links: number; truncated: boolean };
}

/** 흐름 추천 일 하나. 흐름 추천 일이 아니거나 없으면 null — 라우트가 404 를 낸다 */
export async function 흐름결과읽기(jobId: number, 지도읽음: (prefix: string) => boolean): Promise<흐름결과 | null> {
  let job = await 일하나(jobId);
  if (job === null || job.kind !== 'SUGGEST_FLOWS') return null;
  // 닫기는 표를 훑는다 — 화면이 몇 초마다 묻는 매번이 아니라 그 일이 아직 안 끝났을 때만 한다(성능 결과 보기와 같다)
  if (job.status === 'QUEUED' || job.status === 'RUNNING') {
    await 흐름일닫기();
    job = (await 일하나(jobId)) ?? job;
  }
  const 재료 = job.input as 흐름재료;
  const r = await (await db()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [job.serviceId]);
  const 보임 = 지도읽음(r.rows[0]?.prefix ?? '');
  const 후보 = job.status === 'DONE' ? (job.output as { candidates: 흐름후보[] }).candidates : null;
  return {
    status: job.status,
    candidates: 후보 === null ? null : 후보.map((c) => (보임 ? c : { ...c, links: [] })),
    error: job.error,
    material: { reqs: 재료.reqs.length, cases: 재료.cases.length, links: 재료.links.length, truncated: 재료.truncated },
  };
}
