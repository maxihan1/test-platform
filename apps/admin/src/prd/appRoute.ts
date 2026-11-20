// 앱 조작 맵 — 작성 에이전트가 올리는 줄과 경로 검색 명령이 읽는 맵 글 (도메인/작성 §3.6 「★ 앱 탐색」 · §7 「앱 조작 맵 통로」)
// 게임 조작 맵(gameRoute.ts)과 꼴은 같지만 따로 둔다 — 사용자가 표 하나를 같이 쓰자는 제안을 물리쳤다(결정 6). 「다시 확인」은 정식 실행만 단다(APP-F4-09)

import { db } from '../settings/store.js';

export const 줄종류 = { MOVE: '이동', SETUP: '데이터 세팅', API: 'API', TERM: '용어', POPUP: '돌발 팝업' } as const;
type 종류 = keyof typeof 줄종류;
const 상태글 = { OK: '확인', RECHECK: '다시 확인', BLOCKED: '진행 불가' } as const;
type 상태 = keyof typeof 상태글;

export interface 맵줄 {
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
type 지울줄 = Pick<맵줄, 'kind' | 'fromKey' | 'action'>;

// 2026-11-20 APP-F4-03 시작 질문 — 칸 한도는 게임 조작 맵과 같고 줄 수만 5,000. crawl 한 번이 화면 100장 · 화면마다 누르기 30 이면 이동 줄만 3,000 을 넘는다
const 상한 = { 줄: 5_000, 열쇠: 200, 글: 500, 칸: 10_000, 빌드: 100, 소요: 86_400_000 } as const;
// 경로 검색 명령이 맵 글을 한 줄씩 「 · 」 「 → 」로 잘라 읽는다 — 글 칸에 이것들이 들면 칸이 갈린다.
// 앞뒤 빈칸 · 끝의 「·」 「→」 는 이어 붙일 때 가르개가 되고, NUL 은 jsonb 가 받지 않아 500 이 된다
const 가르개 = /\n|\r|\u0000| · | → |^[·→]|[·→]$/;

const 틀림 = (detail: string) => ({ error: 'BAD_ROUTE', detail }) as const;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown, 최대: number): v is string => typeof v === 'string' && v.trim() === v && v !== '' && v.length <= 최대 && !가르개.test(v);
/** 빈 칸(undefined · null)은 null, 있으면 글 검사를 지나야 한다. 틀리면 undefined */
const 빈칸또는글 = (v: unknown, 최대: number): string | null | undefined => (v === undefined || v === null ? null : 글인가(v, 최대) ? v : undefined);
const 묶음열쇠 = (kind: string, fromKey: string, action: string) => JSON.stringify([kind, fromKey, action]);
// in 은 toString 같은 물려받은 이름도 통과시켜 DB CHECK 가 500 을 낸다
const 종류인가 = (v: unknown): v is 종류 => typeof v === 'string' && Object.hasOwn(줄종류, v);

function 지울줄검사(x: unknown): 지울줄 | null {
  const e = 객체(x);
  if (!종류인가(e.kind) || !글인가(e.fromKey, 상한.열쇠) || !글인가(e.action, 상한.열쇠)) return null;
  return { kind: e.kind, fromKey: e.fromKey, action: e.action };
}

function 줄검사(x: unknown, 자리: string): 맵줄 | ReturnType<typeof 틀림> {
  const e = 객체(x);
  if (!종류인가(e.kind)) return 틀림(`${자리}.kind`);
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
  // 화면 파일 함수 이름(fn)은 케이스 작성 뒤 채우고 정식 실행이 줄을 맞출 때 쓴다 — 탐색 때는 아직 없어 null 도 받는다
  const fn = f === null ? null : (f as Record<string, unknown>).fn ?? null;
  if (fn !== null && !글인가(fn, 상한.열쇠)) return 틀림(`${자리}.fields.fn`);
  // AI 는 「확인」 「진행 불가」만 올린다 — 「다시 확인」은 실행이 단다
  if (e.status !== 'OK' && e.status !== 'BLOCKED') return 틀림(`${자리}.status`);
  const reason = 빈칸또는글(e.reason, 상한.글);
  // 까닭은 진행 불가에만 — 확인 줄에 까닭이 실리면 어느 쪽을 뜻했는지 모른다
  if (reason === undefined || (e.status === 'BLOCKED') !== (reason !== null)) return 틀림(`${자리}.reason`);
  const buildNo = 빈칸또는글(e.buildNo, 상한.빌드);
  if (buildNo === undefined) return 틀림(`${자리}.buildNo`);
  return {
    kind: e.kind, fromKey: e.fromKey, action: e.action, toKey, helper, durationMs: d, warning,
    fields: f as Record<string, unknown> | null, status: e.status, reason, buildNo,
  };
}

/** PUT 본문을 본다. 틀린 첫 자리를 detail 로 */
export function 맵줄검사(본문: unknown): { rows: 맵줄[]; remove: 지울줄[] } | ReturnType<typeof 틀림> {
  const b = 객체(본문);
  if (!Array.isArray(b.rows) || b.rows.length > 상한.줄) return 틀림('rows');
  const 지울것 = b.remove ?? [];
  if (!Array.isArray(지울것) || 지울것.length > 상한.줄) return 틀림('remove');
  const 본것 = new Set<string>();
  const rows: 맵줄[] = [];
  for (const [i, x] of (b.rows as unknown[]).entries()) {
    const 줄 = 줄검사(x, `rows.${String(i)}`);
    if ('error' in 줄) return 줄;
    // 한 본문에 같은 줄이 둘이면 어느 쪽을 뜻했는지 모른다
    const 열쇠 = 묶음열쇠(줄.kind, 줄.fromKey, 줄.action);
    if (본것.has(열쇠)) return 틀림(`rows.${String(i)}.action`);
    본것.add(열쇠);
    rows.push(줄);
  }
  const remove: 지울줄[] = [];
  for (const [i, x] of 지울것.entries()) {
    const 줄 = 지울줄검사(x);
    // 넣으면서 지우는 줄은 뜻이 둘이다
    if (줄 === null || 본것.has(묶음열쇠(줄.kind, 줄.fromKey, 줄.action))) return 틀림(`remove.${String(i)}`);
    remove.push(줄);
  }
  return { rows, remove };
}

/** 종류 「Android 앱」만 앱 조작 맵을 쓴다 — 게임은 game_route 다 */
export async function 앱서비스인가(서비스: number): Promise<boolean> {
  const r = await (await db()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [서비스]);
  return r.rows[0]?.kind === 'APP';
}

/**
 * 올린 줄만 넣거나 고치고 remove 는 지운다. 그 애플리케이션 몫을 통째로 바꾸지 않는다 — 작성마다 새로 해 본 줄만 올린다.
 * 이미 있는 줄은 빈 칸이 지난 값을 지키고 fields 는 열쇠마다 덮는다 — 작성 끝에 함수 이름만 채워 다시 올려도 경고 · 걸린 시간이 남는다
 */
export async function 맵줄넣기(서비스: number, rows: 맵줄[], remove: 지울줄[]): Promise<void> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(
      `DELETE FROM app_route a USING jsonb_to_recordset($2::jsonb) AS x(kind text, from_key text, action text)
        WHERE a.service_id = $1 AND a.kind = x.kind AND a.from_key = x.from_key AND a.action = x.action`,
      [서비스, JSON.stringify(remove.map((r) => ({ kind: r.kind, from_key: r.fromKey, action: r.action })))],
    );
    // 빌드 번호를 안 실은 확인 줄은 다시 해 본 것이 아니다 — 「어느 빌드에서 통과」를 지키고, 정식 실행이 단 「다시 확인」도 풀지 않는다.
    // 까닭은 지키지 않는다 — 진행 불가였던 줄이 확인으로 오면 까닭이 남으면 안 된다. 빌드는 「통과한 빌드」라 진행 불가 줄은 물려받지 않고,
    // 진행 불가였던 줄의 빌드도 확인 줄이 물려받지 않는다(막힌 빌드가 「확인 · 빌드 N」으로 보이면 안 된다).
    // fields 의 null 값은 빈 칸과 같다 — 탐색이 fn: null 로 다시 올려도 케이스 작성이 채운 함수 이름을 지우지 않는다
    await 손.query(
      `INSERT INTO app_route (service_id, kind, from_key, action, to_key, helper, duration_ms, warning, fields, status, reason, build_no)
       SELECT $1, x.kind, x.from_key, x.action, x.to_key, x.helper, x.duration_ms, x.warning, NULLIF(jsonb_strip_nulls(x.fields), '{}'), x.status, x.reason, x.build_no
         FROM jsonb_to_recordset($2::jsonb) AS x(kind text, from_key text, action text, to_key text, helper text, duration_ms integer,
                                                warning text, fields jsonb, status text, reason text, build_no text)
       ON CONFLICT (service_id, kind, from_key, action) DO UPDATE
         SET to_key = COALESCE(EXCLUDED.to_key, app_route.to_key), helper = COALESCE(EXCLUDED.helper, app_route.helper),
             duration_ms = COALESCE(EXCLUDED.duration_ms, app_route.duration_ms), warning = COALESCE(EXCLUDED.warning, app_route.warning),
             fields = CASE WHEN EXCLUDED.fields IS NULL THEN app_route.fields ELSE COALESCE(app_route.fields, '{}') || EXCLUDED.fields END,
             status = CASE WHEN EXCLUDED.status = 'OK' AND EXCLUDED.build_no IS NULL AND app_route.status = 'RECHECK' THEN 'RECHECK' ELSE EXCLUDED.status END,
             reason = EXCLUDED.reason, build_no = CASE WHEN EXCLUDED.status = 'BLOCKED' OR app_route.status = 'BLOCKED' THEN EXCLUDED.build_no ELSE COALESCE(EXCLUDED.build_no, app_route.build_no) END,
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

export interface 읽은줄 {
  kind: 종류; from_key: string; action: string; to_key: string | null; helper: string | null; duration_ms: number | null;
  warning: string | null; fields: Record<string, unknown> | null; status: 상태; reason: string | null; build_no: string | null;
}

/** 한 줄 — 앞은 「출발 → 동작 → 도착」, 뒤는 「이름 값」 칸을 「 · 」로 잇고 칸(JSON)은 맨 끝에 둔다(경로 검색이 남은 줄을 통째로 JSON 으로 읽는다) */
function 줄글(x: 읽은줄): string {
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

/** 경로 검색 명령이 읽는 맵 글(자료 폴더 app-route.txt). 종류마다 묶고 출발 열쇠 · 동작 차례 */
export async function 앱맵글(서비스: number): Promise<string> {
  const r = await (await db()).query<읽은줄>(
    `SELECT kind, from_key, action, to_key, helper, duration_ms, warning, fields, status, reason, build_no
       FROM app_route WHERE service_id = $1 ORDER BY from_key COLLATE "C", action COLLATE "C"`,
    [서비스],
  );
  return 앱맵글짓기(r.rows);
}

/** 읽은 줄(출발 열쇠 · 동작 차례)을 맵 글로 — 경로 검색 명령(APP-F4-04)이 이 꼴을 그대로 읽는다 */
export function 앱맵글짓기(줄들: 읽은줄[]): string {
  const 묶음 = (Object.keys(줄종류) as 종류[]).flatMap((k) => {
    const 들 = 줄들.filter((x) => x.kind === k);
    return 들.length === 0 ? [] : [`## ${줄종류[k]} (${k}) — ${String(들.length)}줄`, ...들.map(줄글), ''];
  });
  return [`# 앱 조작 맵 — 줄 ${String(줄들.length)}개. 「어떻게 가나」만 담는다 — 기대값의 근거가 아니다`, '', ...묶음].join('\n').trimEnd() + '\n';
}
