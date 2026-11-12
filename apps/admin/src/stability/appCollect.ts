// 앱 묶음의 항목 logcat 을 읽어 크래시 · ANR 을 지문마다 모은다 (도메인/안정화 §3.15 「집계」 분모 · 「무엇을 세나」 · 「견본 · 가림」)

import type { DeviceInfo } from '@platform/kit';
import type { Pool } from 'pg';

import { 거를패키지 } from '../execution/farm.js';
import { 팜logcat읽기 } from '../execution/farmEvidence.js';
import { 가린다, 항목비밀 } from '../execution/trial.js';

import { 앱항목오류 } from './appJudge.js';
import type { 모은오류, 수집 } from './save.js';

interface 항목행 {
  history_id: string;
  run_id: string;
  tc_id: string;
  status: string;
  device: DeviceInfo | null;
  began_at: Date;
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
}

// 시안의 디바이스 칸 「Galaxy S23 · Android 14」 — 앱 판은 빌드 표시가 따로 있어 뺀다
const 디바이스 = (d: DeviceInfo | null): string | null => (d === null ? null : `${d.model ?? '모델 모름'} · Android ${d.osVersion ?? '버전 모름'}`);

/** 묶음(실행 번호들)의 android 항목을 모은다. logcat 파일이 없는 항목은 기록 없음이라 분모에서도 뺀다 */
export async function 앱수집(pool: Pool, serviceId: number, env: string, runIds: readonly number[]): Promise<수집> {
  const 항목 = (
    await pool.query<항목행>(
      `SELECT i.history_id, i.run_id, i.tc_id, i.status, i.device, i.params, i.expected, i.param_schema, i.expected_schema,
              COALESCE(i.finished_at - COALESCE(i.duration_ms, 0) * interval '1 millisecond', i.started_at) AS began_at
         FROM run_item i WHERE i.run_id = ANY($1) AND i.platform = 'android' ORDER BY i.history_id`,
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

  const 판정 = new Map<string, boolean>();
  const 오류 = new Map<string, 모은오류>();
  let crashes = 0;
  for (const i of 항목) {
    const 글 = await 팜logcat읽기(Number(i.run_id), Number(i.history_id));
    if (글 === null) continue;
    판정.set(i.tc_id, true);
    const h = Number(i.history_id);
    const device = 디바이스(i.device);
    // 견본은 넣을 때 그 항목 값의 비밀값을 글자째 가린다 — Issue Bunker 실패 본문의 logcat 줄과 같은 가림
    const 비밀 = 항목비밀(i);
    for (const e of 앱항목오류(글, 패키지(i))) {
      crashes += e.hits;
      const 자리 = 오류.get(e.지문.fingerprint) ?? { 지문: e.지문, 발생: [], 견본: [] };
      자리.발생.push({ historyId: h, tcId: i.tc_id, itemStatus: i.status, seq: null, hits: e.hits, crash: true, device });
      자리.견본.push({ historyId: h, tcId: i.tc_id, text: 가린다(e.견본, 비밀) as string, page: null, device, at: i.began_at });
      오류.set(e.지문.fingerprint, 자리);
    }
  }
  // 케이스 판정은 그 케이스의 항목 전부로 — 기록 없는 항목이 실패여도 판정은 실패다
  for (const i of 항목) if (판정.has(i.tc_id) && i.status !== 'PASS') 판정.set(i.tc_id, false);
  return { 판정, 오류, crashes };
}
