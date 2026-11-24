// 앱 · 게임 묶음의 항목 logcat(크래시 · ANR)과 게임 오류 파일(Exception)을 읽어 지문마다 모은다 (도메인/안정화 §3.15 「집계」 분모 · 「무엇을 세나」 · 「견본 · 가림」)

import type { DeviceInfo } from '@platform/kit';
import type { Pool } from 'pg';

import { 거를패키지 } from '../execution/farm.js';
import { 게임오류읽기, 팜logcat읽기, 팜logcat있음 } from '../execution/farmEvidence.js';
import { 단위비밀들 } from '../execution/execRead.js';
import { 가린다, 항목비밀 } from '../execution/trial.js';

import { 앱항목오류 } from './appJudge.js';
import { 게임항목오류 } from './gameJudge.js';
import { 깨진케이스, 시각으로붙인다 } from './procCase.js';
import type { 모은오류, 수집 } from './save.js';

interface 항목행 {
  history_id: string;
  run_id: string;
  tc_id: string;
  status: string;
  message: string | null;
  device: DeviceInfo | null;
  began_at: Date;
  /** 실행 단위 번호 — 폴더 · 기록이 이 번호에 한 벌이다. 옛 꼴 케이스는 케이스 줄 번호다 */
  unit: string;
  proc: boolean;
  case_started_at: Date | null;
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
}

// 시안의 디바이스 칸 「Galaxy S23 · Android 14」 — 앱 판은 빌드 표시가 따로 있어 뺀다
const 디바이스 = (d: DeviceInfo | null): string | null => (d === null ? null : `${d.model ?? '모델 모름'} · Android ${d.osVersion ?? '버전 모름'}`);

/**
 * 묶음(실행 번호들)의 android 항목을 모은다. 앱은 logcat 파일이 없는 항목이 기록 없음이라 분모에서도 뺀다.
 * 게임은 게임 오류 파일이나 logcat 중 하나라도 있으면 기록이고 Exception 도 센다 — logcat 만 없으면 그 항목의 크래시 · ANR 만 0 이다 (§3.15 「분모」)
 */
export async function 앱수집(pool: Pool, serviceId: number, env: string, runIds: readonly number[], 게임 = false): Promise<수집> {
  const 항목 = (
    await pool.query<항목행>(
      // 프로시저 안 케이스는 같은 실행 단위끼리 프로시저 안 차례로 둔다 — 깨진 케이스 · 첫 케이스 · 시각이 같은 절차를 이 차례로 고른다
      `SELECT i.history_id, i.run_id, i.tc_id, i.status, i.error->>'message' AS message, i.device, i.params, i.expected, i.param_schema, i.expected_schema,
              COALESCE(i.exec_id, i.history_id) AS unit, e.proc_id IS NOT NULL AS proc, i.case_started_at,
              COALESCE(i.case_started_at, i.finished_at - COALESCE(i.duration_ms, 0) * interval '1 millisecond', i.started_at) AS began_at
         FROM run_item i LEFT JOIN run_exec e ON e.exec_id = i.exec_id
        WHERE i.run_id = ANY($1) AND i.platform = 'android' ORDER BY unit, i.exec_seq, i.history_id`,
      [runIds],
    )
  ).rows;
  // 앱 파일이 APK 주소면 서버는 패키지를 모른다 — 항목은 자기 연결이 연 패키지(kit 기기 정보)로 가른다.
  // 그것이 없는 항목(기기 정보를 못 읽음)만 대상 서버 줄의 패키지 이름, 그것도 없으면 묶음의 다른 항목이 연 패키지로 가른다.
  // 묶음 전체를 늘 합치면 다른 앱(설정 등)을 연 케이스 하나 때문에 그 앱 크래시까지 이 애플리케이션 것으로 센다
  const 앱경로 = (await pool.query<{ app_path: string | null }>('SELECT app_path FROM service_env WHERE service_id = $1 AND env = $2', [serviceId, env])).rows[0]?.app_path;
  const 글자 = (p: string | null | undefined): p is string => typeof p === 'string' && p !== '';
  const 경로패키지 = 거를패키지(앱경로);
  const 묶음패키지 = new Set(항목.map((i) => i.device?.appPackage).filter(글자));
  const 패키지 = (i: 항목행): ReadonlySet<string> => {
    const 자기 = i.device?.appPackage;
    if (글자(자기)) return new Set([자기]);
    return 글자(경로패키지) ? new Set([경로패키지]) : 묶음패키지;
  };
  if (묶음패키지.size === 0 && !글자(경로패키지) && 항목.length > 0) {
    console.warn(`[stability] 실행 ${runIds.join(' · ')} — 앱 패키지 이름을 몰라 크래시 · ANR 을 가르지 못했다(기기 정보 appPackage · 대상 서버 앱 경로가 비었다)`);
  }

  // 게임 오류 시각을 단계 시작 시각에 맞춘다 — 시각이 없는 단계(이 칸 전 기록)는 빠진다 (§3.15 「지문」 단계)
  const 단계 = new Map<number, { seq: number; startedAt: string | null }[]>();
  if (게임) {
    const 줄들 = await pool.query<{ history_id: string; seq: number; started_at: Date | null }>(
      'SELECT history_id, seq, started_at FROM run_item_step WHERE history_id = ANY($1)',
      [항목.map((i) => i.history_id)],
    );
    for (const s of 줄들.rows) {
      const h = Number(s.history_id);
      단계.set(h, [...(단계.get(h) ?? []), { seq: s.seq, startedAt: s.started_at?.toISOString() ?? null }]);
    }
  }

  const 단위들 = new Map<string, 항목행[]>();
  for (const i of 항목) 단위들.set(i.unit, [...(단위들.get(i.unit) ?? []), i]);

  const 판정 = new Map<string, boolean>();
  const 오류 = new Map<string, 모은오류>();
  let crashes = 0;
  for (const 줄들 of 단위들.values()) {
    // 이 볼륨에 있는 것만 읽는다 — 읽기는 없으면 터널 너머 러너에서 받아 오는데, 기다림은 이 볼륨만 봐서
    // 그 러너가 집계 전에 받았느냐에 따라 같은 케이스가 분모에 들어갔다 빠졌다 한다 (§3.15 「분모」 다른 기계의 러너)
    const runId = Number(줄들[0]!.run_id);
    const 번호 = Number(줄들[0]!.unit);
    const 게임글 = 게임 ? await 게임오류읽기(runId, 번호) : null;
    const 글 = (await 팜logcat있음(runId, 번호)) ? await 팜logcat읽기(runId, 번호) : null;
    // 게임은 둘 중 하나만 있어도 기록이다 — 게임이 크래시로 죽으면 kit 이 게임 오류 파일을 못 남겨도 logcat 에 그 크래시가 있다 (§3.15 결정 14 · 「분모」)
    if (글 === null && 게임글 === null) continue;
    // 프로시저는 시작한 케이스만 기록이 있다 — 흐름이 멈춘 뒤라 시작도 못 한 케이스에서는 오류가 날 수 없다 (§3.15 「테스트 프로시저」 분모)
    const 프로시저 = 줄들[0]!.proc;
    const 시작한 = (프로시저 ? 줄들.filter((i) => i.case_started_at !== null) : 줄들).map((i) => ({
      i,
      status: i.status,
      message: i.message,
      caseStartedAt: (i.case_started_at ?? i.began_at).toISOString(),
      단계: 단계.get(Number(i.history_id)) ?? [],
    }));
    const [첫, ...나머지] = 시작한;
    if (첫 === undefined) continue;
    const 케이스들 = [첫, ...나머지] as const;
    for (const c of 케이스들) 판정.set(c.i.tc_id, true);
    // 견본은 넣을 때 그 항목 값의 비밀값을 글자째 가린다 — Issue Bunker 실패 본문의 logcat 줄과 같은 가림.
    // 프로시저는 기록이 한 벌이라 한 케이스의 비밀값이 다른 케이스에 붙인 견본에 되비칠 수 있어 그 단위 케이스 줄 전부의 것을 합친다
    const 비밀 = 프로시저 ? ((await 단위비밀들([번호])).get(번호) ?? []) : 항목비밀(첫.i);
    const 넣는다 = (i: 항목행, 지문: 모은오류['지문'], 견본: string, seq: number | null, hits: number, crash: boolean): void => {
      const h = Number(i.history_id);
      const device = 디바이스(i.device);
      const 자리 = 오류.get(지문.fingerprint) ?? { 지문, 발생: [], 견본: [] };
      자리.발생.push({ historyId: h, tcId: i.tc_id, itemStatus: i.status, seq, hits, crash, device });
      자리.견본.push({ historyId: h, tcId: i.tc_id, text: 가린다(견본, 비밀) as string, page: null, device, at: i.began_at });
      오류.set(지문.fingerprint, 자리);
    };
    // logcat 은 폰 지역 시각이라 서버 시각에 못 맞춘다 — 흐름이 깨진 케이스(옛 꼴은 그 항목 하나)에 붙인다
    const 깨진 = 깨진케이스(케이스들).i;
    const 앱오류 = 글 === null ? [] : 앱항목오류(글, 패키지(깨진));
    for (const e of 앱오류) {
      crashes += e.hits;
      넣는다(깨진, e.지문, e.견본, null, e.hits, true);
    }
    if (게임글 !== null) {
      // 같은 단위 logcat 에 크래시 · ANR 도 남았으면 「크래시 연결」이다 (공통/4 stab_occurrence.crash)
      for (const e of 게임항목오류(게임글, 단계.get(Number(첫.i.history_id)) ?? [])) {
        const 자리 = 프로시저 ? 시각으로붙인다(e.때, 케이스들) : { 케이스: 첫, seq: e.seq };
        넣는다(자리.케이스.i, e.지문, e.견본, 자리.seq, e.hits, 앱오류.length > 0);
      }
    }
  }
  // 케이스 판정은 그 케이스의 항목 전부로 — 기록 없는 항목이 실패여도 판정은 실패다
  for (const i of 항목) if (판정.has(i.tc_id) && i.status !== 'PASS') 판정.set(i.tc_id, false);
  return { 판정, 오류, crashes };
}
