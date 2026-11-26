// 앱 배운 것 — 작성 에이전트가 올리는 배운 줄과 찾기 명령이 읽는 배운 것 글 (도메인/작성 §3.6 「★ 앱 배우기」 · §7 「앱 배운 것 통로」)
// learned 칸 검사는 게임 지도 것(gameKinds.ts 배운것틀림)의 앱 갈래를 같이 쓴다 — 줄 꼴이 같아야 찾기 명령 · 체크포인트가 한 손으로 읽는다

import { db } from '../settings/store.js';
import { type 배운것, 배운것틀림, 열쇠꼴 } from './gameKinds.js';

export const 배운종류 = {
  SCREEN: '화면', RULE: '규칙', INPUT: '입력', STATE: '상태', FLOW: '흐름', ROLE: '다른 계정', SIGNAL: '안내',
  ASK: '궁금한 것', ODD: '이상한 것', NOTE: '쪽지',
} as const;
type 종류 = keyof typeof 배운종류;

export interface 배운줄 {
  kind: 종류;
  key: string;
  name: string;
  screen: string | null;
  /** null 이면 그 줄을 지운다 */
  learned: 배운것 | null;
}

const 상한 = { 줄: 5_000, 글: 200 } as const;
// 줄바꿈은 배운 것 글의 한 줄을 가르고, NUL · 짝 없는 surrogate 는 jsonb 가 받지 않아 500 이 된다
const 못넣는글자 = /[\n\r\u0000]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
const 쪽지열쇠 = 'note:쪽지';

const 틀림 = (detail: string) => ({ error: 'BAD_LEARNED', detail }) as const;
const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 상한.글 && !못넣는글자.test(v);
// in 은 toString 같은 물려받은 이름도 통과시켜 DB CHECK 가 500 을 낸다
const 종류인가 = (v: unknown): v is 종류 => typeof v === 'string' && Object.hasOwn(배운종류, v);
// 열쇠 앞머리가 종류다 — 찾기 명령이 열쇠만 보고 종류를 안다. 쪽지는 세션마다 하나라 열쇠가 하나뿐이다
const 열쇠가맞나 = (kind: 종류, key: string): boolean => (kind === 'NOTE' ? key === 쪽지열쇠 : key.startsWith(`${kind.toLowerCase()}:`) && 열쇠꼴.test(key));

function 줄검사(x: unknown, 자리: string): 배운줄 | ReturnType<typeof 틀림> {
  const e = 객체(x);
  if (!종류인가(e.kind)) return 틀림(`${자리}.kind`);
  if (!글인가(e.key) || !열쇠가맞나(e.kind, e.key)) return 틀림(`${자리}.key`);
  if (!글인가(e.name)) return 틀림(`${자리}.name`);
  const screen = e.screen ?? null;
  if (screen !== null && !(글인가(screen) && screen.startsWith('app:'))) return 틀림(`${자리}.screen`);
  if (e.learned === null) return { kind: e.kind, key: e.key, name: e.name, screen, learned: null };
  const 칸 = 배운것틀림(e.learned, e.kind, '앱');
  if (칸 !== null) return 틀림(`${자리}.learned${칸 === '' ? '' : `.${칸}`}`);
  return { kind: e.kind, key: e.key, name: e.name, screen, learned: e.learned as 배운것 };
}

/** PUT 본문을 본다. 틀린 첫 자리를 detail 로 */
export function 배운줄검사(본문: unknown): { rows: 배운줄[] } | ReturnType<typeof 틀림> {
  const b = 객체(본문);
  if (!Array.isArray(b.rows) || b.rows.length > 상한.줄) return 틀림('rows');
  const 본것 = new Set<string>();
  const rows: 배운줄[] = [];
  for (const [i, x] of (b.rows as unknown[]).entries()) {
    const 줄 = 줄검사(x, `rows.${String(i)}`);
    if ('error' in 줄) return 줄;
    // 한 본문에 같은 열쇠가 둘이면 어느 쪽을 뜻했는지 모른다
    if (본것.has(줄.key)) return 틀림(`rows.${String(i)}.key`);
    본것.add(줄.key);
    rows.push(줄);
  }
  return { rows };
}

/**
 * 올린 줄만 넣거나 통째로 바꾸고 learned 가 null 인 줄은 지운다. 그 애플리케이션 몫을 통째로 바꾸지 않는다 — 작성마다 새로 배운 줄만 올린다.
 * 앞에 잰 것을 서버가 합치지 않는다 — 다시 올린 줄이 옮겨 적는다(작성 §3.6 「★ 앱 배우기」 「배운 것 — 종류와 칸」)
 */
export async function 배운줄넣기(서비스: number, rows: 배운줄[]): Promise<void> {
  const 남길 = rows.filter((r) => r.learned !== null);
  // 지우기와 넣기를 한 문장으로 — 열쇠가 겹치지 않아(배운줄검사) 차례가 상관없고 반만 반영되는 일이 없다
  await (await db()).query(
    `WITH 지움 AS (DELETE FROM app_learned WHERE service_id = $1 AND key = ANY($3::text[]))
     INSERT INTO app_learned (service_id, key, kind, name, screen_key, learned)
     SELECT $1, x.key, x.kind, x.name, x.screen_key, x.learned
       FROM jsonb_to_recordset($2::jsonb) AS x(key text, kind text, name text, screen_key text, learned jsonb)
     ON CONFLICT (service_id, key) DO UPDATE
       SET kind = EXCLUDED.kind, name = EXCLUDED.name, screen_key = EXCLUDED.screen_key, learned = EXCLUDED.learned, updated_at = now()`,
    [
      서비스,
      JSON.stringify(남길.map((r) => ({ key: r.key, kind: r.kind, name: r.name, screen_key: r.screen, learned: r.learned }))),
      rows.filter((r) => r.learned === null).map((r) => r.key),
    ],
  );
}

export interface 읽은배운줄 { kind: 종류; key: string; name: string; screen_key: string | null; learned: 배운것 }

/** 찾기 명령이 읽는 배운 것 글(자료 폴더 app-learned.txt). 종류마다 묶고 열쇠 차례 */
export async function 배운것글(서비스: number): Promise<string> {
  const r = await (await db()).query<읽은배운줄>(
    'SELECT kind, key, name, screen_key, learned FROM app_learned WHERE service_id = $1 ORDER BY key COLLATE "C"',
    [서비스],
  );
  return 배운것글짓기(r.rows);
}

/** 읽은 줄(열쇠 차례)을 배운 것 글로 — 「배움 」 뒤는 줄 끝까지 JSON 이라 맨 끝에 둔다 */
export function 배운것글짓기(줄들: 읽은배운줄[]): string {
  const 한줄 = (x: 읽은배운줄) =>
    [`- ${x.key}`, x.name, x.screen_key === null ? null : `화면 ${x.screen_key}`, `배움 ${JSON.stringify(x.learned)}`].filter((v) => v !== null).join(' · ');
  const 묶음 = (Object.keys(배운종류) as 종류[]).flatMap((k) => {
    const 들 = 줄들.filter((x) => x.kind === k);
    return 들.length === 0 ? [] : [`## ${배운종류[k]} (${k}) — ${String(들.length)}줄`, ...들.map(한줄), ''];
  });
  return [`# 앱 배운 것 — 줄 ${String(줄들.length)}개. 기대값의 근거가 아니다`, '', ...묶음].join('\n').trimEnd() + '\n';
}
