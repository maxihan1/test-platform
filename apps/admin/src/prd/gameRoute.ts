// 조작 맵 — 작성 에이전트가 올리는 조작 행과 경로 검색 명령이 읽는 맵 글 (도메인/게임 §3.10 「탐색 플레이 · 조작 맵」 · §7 game-route)
// 맵은 「어떻게 가나」만 담는다 — 기대값 근거가 아니다. 「재확인 필요」는 정식 실행만 단다(GAME-F5-06)

import type { GamePopup } from '@platform/kit';

import { db } from '../settings/store.js';

export const 행종류 = { MOVE: '이동 · 조작', SETUP: '상태 설정', LOG: '로그', TERM: '용어', POPUP: '돌발 팝업' } as const;
type 종류 = keyof typeof 행종류;
const 상태글 = { OK: '확인', RECHECK: '재확인 필요', BLOCKED: '진행 불가' } as const;
type 상태 = keyof typeof 상태글;

export interface 조작행 {
  kind: 종류;
  fromKey: string;
  action: string;
  toKey: string | null;
  helper: string | null;
  durationMs: number | null;
  warning: string | null;
  fields: Record<string, unknown> | null;
  status: 'OK' | 'BLOCKED';
  reason: string | null;
  buildNo: string | null;
}
export type 지울행 = Pick<조작행, 'kind' | 'fromKey' | 'action'>;

// 2026-11-19 GAME-F5-02 시작 질문 — 글 · 칸 한도는 게임 지도와 같고, 줄 수는 탐색 플레이 한 번에 2,000행을 넘을 일이 없어 그보다 작다
const 상한 = { 줄: 2_000, 열쇠: 200, 글: 500, 칸: 10_000, 빌드: 100, 소요: 86_400_000 } as const;
// 경로 검색 명령이 맵 글을 한 줄씩 「 · 」 「 → 」로 잘라 읽는다 — 글 칸에 이것들이 들면 칸이 갈린다.
// 앞뒤 빈칸 · 끝의 「·」 「→」 는 이어 붙일 때 가르개가 되고, NUL 은 jsonb 가 받지 않아 500 이 된다
const 가르개 = /\n|\r|\u0000| · | → |^[·→]|[·→]$/;

const 틀림 = (detail: string) => ({ error: 'BAD_ROUTE', detail }) as const;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown, 최대: number): v is string => typeof v === 'string' && v.trim() === v && v !== '' && v.length <= 최대 && !가르개.test(v);
/** 빈 칸(undefined · null)은 null, 있으면 글 검사를 지나야 한다. 틀리면 undefined */
const 빈칸또는글 = (v: unknown, 최대: number): string | null | undefined => (v === undefined || v === null ? null : 글인가(v, 최대) ? v : undefined);
const 묶음열쇠 = (kind: string, fromKey: string, action: string) => JSON.stringify([kind, fromKey, action]);

function 지울행검사(x: unknown): 지울행 | null {
  const e = 객체(x);
  if (typeof e.kind !== 'string' || !Object.hasOwn(행종류, e.kind)) return null;
  if (!글인가(e.fromKey, 상한.열쇠) || !글인가(e.action, 상한.열쇠)) return null;
  return { kind: e.kind as 종류, fromKey: e.fromKey, action: e.action };
}

function 행검사(x: unknown, 자리: string): 조작행 | { error: 'BAD_ROUTE'; detail: string } {
  const e = 객체(x);
  // in 은 toString 같은 물려받은 이름도 통과시켜 DB CHECK 가 500 을 낸다
  if (typeof e.kind !== 'string' || !Object.hasOwn(행종류, e.kind)) return 틀림(`${자리}.kind`);
  if (!글인가(e.fromKey, 상한.열쇠)) return 틀림(`${자리}.fromKey`);
  if (!글인가(e.action, 상한.열쇠)) return 틀림(`${자리}.action`);
  const toKey = 빈칸또는글(e.toKey, 상한.열쇠);
  if (toKey === undefined) return 틀림(`${자리}.toKey`);
  const helper = 빈칸또는글(e.helper, 상한.열쇠);
  if (helper === undefined) return 틀림(`${자리}.helper`);
  const d = e.durationMs ?? null;
  if (d !== null && (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 상한.소요)) return 틀림(`${자리}.durationMs`);
  const warning = 빈칸또는글(e.warning, 상한.글);
  if (warning === undefined) return 틀림(`${자리}.warning`);
  const f = e.fields ?? null;
  // JSON.stringify 는 NUL 을 \u0000 으로 적고 jsonb 는 그것을 받지 않는다
  if (f !== null && (typeof f !== 'object' || Array.isArray(f) || JSON.stringify(f).length > 상한.칸 || JSON.stringify(f).includes('\\u0000'))) return 틀림(`${자리}.fields`);
  // 화면 객체 함수 이름(fn)은 정식 실행이 행을 맞출 때 열쇠로 쓴다(GAME-F5-06) — 다른 칸과 같이 글 규칙을 지킨다. 탐색 플레이 때는 아직 없어 null 도 받는다
  const fn = f === null ? null : (f as Record<string, unknown>).fn ?? null;
  if (fn !== null && !글인가(fn, 상한.열쇠)) return 틀림(`${자리}.fields.fn`);
  // AI 는 「확인」 「진행 불가」만 올린다 — 「재확인 필요」는 실행이 단다
  if (e.status !== 'OK' && e.status !== 'BLOCKED') return 틀림(`${자리}.status`);
  const reason = 빈칸또는글(e.reason, 상한.글);
  // 까닭은 진행 불가에만 — 확인 행에 까닭이 실리면 어느 쪽을 뜻했는지 모른다
  if (reason === undefined || (e.status === 'BLOCKED') !== (reason !== null)) return 틀림(`${자리}.reason`);
  const buildNo = 빈칸또는글(e.buildNo, 상한.빌드);
  if (buildNo === undefined) return 틀림(`${자리}.buildNo`);
  return {
    kind: e.kind as 종류, fromKey: e.fromKey, action: e.action, toKey, helper, durationMs: d, warning,
    fields: f as Record<string, unknown> | null, status: e.status, reason, buildNo,
  };
}

/** PUT 본문을 본다. 틀린 첫 자리를 detail 로 */
export function 조작행검사(본문: unknown): { rows: 조작행[]; remove: 지울행[] } | { error: 'BAD_ROUTE'; detail: string } {
  const b = 객체(본문);
  if (!Array.isArray(b.rows) || b.rows.length > 상한.줄) return 틀림('rows');
  const 지울것 = b.remove ?? [];
  if (!Array.isArray(지울것) || 지울것.length > 상한.줄) return 틀림('remove');
  const 본것 = new Set<string>();
  const rows: 조작행[] = [];
  for (const [i, x] of (b.rows as unknown[]).entries()) {
    const 행 = 행검사(x, `rows.${String(i)}`);
    if ('error' in 행) return 행;
    // 한 본문에 같은 행이 둘이면 어느 쪽을 뜻했는지 모른다
    const 열쇠 = 묶음열쇠(행.kind, 행.fromKey, 행.action);
    if (본것.has(열쇠)) return 틀림(`rows.${String(i)}.action`);
    본것.add(열쇠);
    rows.push(행);
  }
  const remove: 지울행[] = [];
  for (const [i, x] of 지울것.entries()) {
    const 행 = 지울행검사(x);
    // 넣으면서 지우는 행은 뜻이 둘이다
    if (행 === null || 본것.has(묶음열쇠(행.kind, 행.fromKey, 행.action))) return 틀림(`remove.${String(i)}`);
    remove.push(행);
  }
  return { rows, remove };
}

/**
 * 올린 행만 넣거나 고치고 remove 는 지운다. 그 애플리케이션 몫을 통째로 바꾸지 않는다 — 작성마다 새로 해 본 행만 올린다.
 * 이미 있는 행은 빈 칸이 지난 값을 지키고 fields 는 열쇠마다 덮는다 — 작성 끝에 함수 이름만 채워 다시 올려도 경고 · 진행 값이 남는다
 */
export async function 조작행넣기(서비스: number, rows: 조작행[], remove: 지울행[]): Promise<void> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(
      `DELETE FROM game_route g USING jsonb_to_recordset($2::jsonb) AS x(kind text, from_key text, action text)
        WHERE g.service_id = $1 AND g.kind = x.kind AND g.from_key = x.from_key AND g.action = x.action`,
      [서비스, JSON.stringify(remove.map((r) => ({ kind: r.kind, from_key: r.fromKey, action: r.action })))],
    );
    // 빌드 번호를 안 실은 확인 행은 다시 해 본 것이 아니다 — 「어느 빌드에서 통과」를 지키고, 정식 실행이 단 「재확인 필요」도 풀지 않는다.
    // 까닭은 지키지 않는다 — 진행 불가였던 행이 확인으로 오면 까닭이 남으면 안 된다. 빌드는 「통과한 빌드」라 진행 불가 행은 물려받지 않는다
    await 손.query(
      `INSERT INTO game_route (service_id, kind, from_key, action, to_key, helper, duration_ms, warning, fields, status, reason, build_no)
       SELECT $1, x.kind, x.from_key, x.action, x.to_key, x.helper, x.duration_ms, x.warning, x.fields, x.status, x.reason, x.build_no
         FROM jsonb_to_recordset($2::jsonb) AS x(kind text, from_key text, action text, to_key text, helper text, duration_ms integer,
                                                warning text, fields jsonb, status text, reason text, build_no text)
       ON CONFLICT (service_id, kind, from_key, action) DO UPDATE
         SET to_key = COALESCE(EXCLUDED.to_key, game_route.to_key), helper = COALESCE(EXCLUDED.helper, game_route.helper),
             duration_ms = COALESCE(EXCLUDED.duration_ms, game_route.duration_ms), warning = COALESCE(EXCLUDED.warning, game_route.warning),
             fields = CASE WHEN EXCLUDED.fields IS NULL THEN game_route.fields ELSE COALESCE(game_route.fields, '{}') || EXCLUDED.fields END,
             status = CASE WHEN EXCLUDED.status = 'OK' AND EXCLUDED.build_no IS NULL AND game_route.status = 'RECHECK' THEN 'RECHECK' ELSE EXCLUDED.status END,
             reason = EXCLUDED.reason, build_no = CASE WHEN EXCLUDED.status = 'BLOCKED' THEN EXCLUDED.build_no ELSE COALESCE(EXCLUDED.build_no, game_route.build_no) END,
             updated_at = now()`,
      [
        서비스,
        JSON.stringify(
          rows.map((r) => ({
            kind: r.kind, from_key: r.fromKey, action: r.action, to_key: r.toKey, helper: r.helper, duration_ms: r.durationMs,
            warning: r.warning, fields: r.fields, status: r.status, reason: r.reason, build_no: r.buildNo,
          })),
        ),
      ],
    );
    await 손.query('COMMIT');
    손.release();
  } catch (err) {
    // 되돌리기마저 실패하면 끊긴 연결이다 — 원래 오류를 던지고 그 연결은 풀에 돌려놓지 않고 버린다
    try {
      await 손.query('ROLLBACK');
      손.release();
    } catch (e) {
      손.release(e instanceof Error ? e : new Error(String(e)));
    }
    throw err;
  }
}

interface 읽은행 {
  kind: 종류; from_key: string; action: string; to_key: string | null; helper: string | null; duration_ms: number | null;
  warning: string | null; fields: Record<string, unknown> | null; status: 상태; reason: string | null; build_no: string | null;
}

/** 한 행 한 줄 — 앞은 「출발 → 동작 → 도착」, 뒤는 「이름 값」 칸을 「 · 」로 잇고 칸(JSON)은 맨 끝에 둔다(경로 검색이 남은 줄을 통째로 JSON 으로 읽는다) */
function 행줄(x: 읽은행): string {
  const { fn, ...나머지 } = x.fields ?? {};
  return [
    `- ${[x.from_key, x.action, x.to_key].filter((v) => v !== null).join(' → ')}`,
    x.status === 'BLOCKED' ? `${상태글.BLOCKED} — ${x.reason ?? ''}` : 상태글[x.status],
    x.build_no === null ? null : `빌드 ${x.build_no}`,
    x.duration_ms === null ? null : `소요 ${String(x.duration_ms)}ms`,
    x.helper === null ? null : `도우미 ${x.helper}`,
    typeof fn === 'string' ? `함수 ${fn}` : null,
    x.warning === null ? null : `⚠ ${x.warning}`,
    Object.keys(나머지).length === 0 ? null : `칸 ${JSON.stringify(나머지)}`,
  ]
    .filter((v) => v !== null)
    .join(' · ');
}

/** 경로 검색 명령이 읽는 맵 글(자료 폴더 game-route.txt). 종류마다 묶고 출발 열쇠 · 동작 차례 */
export async function 맵글(서비스: number): Promise<string> {
  const r = await (await db()).query<읽은행>(
    `SELECT kind, from_key, action, to_key, helper, duration_ms, warning, fields, status, reason, build_no
       FROM game_route WHERE service_id = $1 ORDER BY from_key COLLATE "C", action COLLATE "C"`,
    [서비스],
  );
  const 묶음 = (Object.keys(행종류) as 종류[]).flatMap((k) => {
    const 들 = r.rows.filter((x) => x.kind === k);
    return 들.length === 0 ? [] : [`## ${행종류[k]} (${k}) — ${String(들.length)}행`, ...들.map(행줄), ''];
  });
  return [`# 조작 맵 — 행 ${String(r.rows.length)}개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다`, '', ...묶음].join('\n').trimEnd() + '\n';
}

// 러너가 자식 환경값 한 칸으로 넘기는 상한과 같다 — 넘으면 러너가 요청을 400 으로 거절해 실행이 서지 않는다 (apps/runner/src/schema.ts 돌발팝업상한)
const 팝업상한 = 100;

/**
 * 실행 요청에 싣는 돌발 팝업 — 「확인」 POPUP 행만. 창 열쇠(game:<장면>/<창 경로>)는 장면 머리를 떼 게임 드라이버가 찾는 주소로 바꾸고, 동작 칸은 닫을 때 누르는 주소다.
 * 장면을 떼는 까닭 — 공지 · 초대 창은 장면을 가리지 않고 뜬다. 열쇠가 game: 꼴이 아니면(사람이 주소로 적은 행) 그대로 싣는다 (도메인/게임 §3.10 결정 31)
 */
export async function 돌발팝업들(서비스: number): Promise<GamePopup[]> {
  const r = await (await db()).query<{ from_key: string; action: string }>(
    `SELECT from_key, action FROM game_route WHERE service_id = $1 AND kind = 'POPUP' AND status = 'OK'
      ORDER BY from_key COLLATE "C", action COLLATE "C" LIMIT $2`,
    [서비스, 팝업상한],
  );
  return r.rows.map((x) => ({ window: /^game:[^/]*(\/.+)$/.exec(x.from_key)?.[1] ?? x.from_key, close: x.action }));
}

/** 실행 요청에 펼쳐 넣는 칸 — 행이 없으면 칸을 안 싣는다 */
export async function 돌발팝업칸(서비스: number): Promise<{ gamePopups?: GamePopup[] }> {
  const 들 = await 돌발팝업들(서비스);
  return 들.length === 0 ? {} : { gamePopups: 들 };
}
