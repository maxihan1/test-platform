// 실행 하나의 「통과 · 알림」(글자는 다르지만 낱말이 맞아 통과로 본 확인 문장)을 모은다 (도메인/리포팅 §7 insights 통과알림들)

import { 지금항목 } from '../execution/single.js';
import { 가린다, 항목비밀 } from '../execution/trial.js';
import { db } from './insights.js';

export interface 통과알림 {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: string;
  statement: string;
  /** kit 이 남긴 알림 글에 비밀값을 가린 기대 · 화면 글을 붙인 것 — 「기획서 문장과 글자가 다름(기대 … / 화면 …)」 */
  notice: string;
}

export interface 통과알림모음 {
  통과알림들: 통과알림[];
  /** 자르기 전 전체 수 — 상한에서 잘려도 화면이 몇 건인지 바로 말한다 */
  통과알림수: number;
}

// 한 실행에 알림이 수천 줄이면 요약 띠가 쪽을 덮는다. 넘치면 앞에서 자른다
export const 통과알림상한 = 200;
// 기대 · 화면 글 하나의 길이. 글자(코드 포인트)로 센다 — UTF-16 으로 자르면 이모지 반쪽이 남는다
export const 알림글길이 = 200;

// 지금 항목(한 건 실행이 붙었으면 바꿔 낀 것)의 확인 문장 가운데 notice 가 붙은 것. 판정은 보지 않는다 — notice 는 PASS 에만 붙는다
const 알림뽑기 = `
  SELECT i.history_id, i.tc_id, i.tc_name, i.platform, i.params, i.expected, i.param_schema, i.expected_schema,
         a.value->>'statement' AS statement, a.value->>'notice' AS notice,
         a.value->'expected' AS 기대, a.value->'actual' AS 화면, count(*) OVER () AS 전체
  FROM ${지금항목('o.run_id = $1')} i
  JOIN run_item_step s ON s.history_id = i.history_id
  CROSS JOIN LATERAL jsonb_array_elements(s.assertions) WITH ORDINALITY AS a(value, ord)
  WHERE jsonb_typeof(a.value->'notice') = 'string'
  ORDER BY i.tc_id, array_position(ARRAY['desktop', 'mobile', 'android']::text[], i.platform::text), i.attempt, s.seq, a.ord
  LIMIT $2`;

interface 알림행 {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: string;
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
  statement: string;
  notice: string;
  기대: unknown;
  화면: unknown;
  전체: string;
}

function 자른다(글: string): string {
  const 글자들 = Array.from(글);
  return 글자들.length > 알림글길이 ? `${글자들.slice(0, 알림글길이).join('')}…` : 글;
}

export async function 통과알림모으기(runId: number): Promise<통과알림모음> {
  const pool = await db();
  const { rows } = await pool.query<알림행>(알림뽑기, [runId, 통과알림상한]);
  return {
    통과알림수: rows.length === 0 ? 0 : Number(rows[0]!.전체),
    통과알림들: rows.map((row) => {
      // 화면 값을 그대로 옮긴 글이라 입력에 넣은 비밀값이 되비칠 수 있다 — 자르기 전에 가려야 잘린 자리에 조각이 안 남는다
      const 비밀 = 항목비밀(row);
      const 글 = (값: unknown): string => 자른다(가린다(String(값), 비밀) as string);
      return {
        historyId: Number(row.history_id),
        tcId: row.tc_id,
        tcName: row.tc_name,
        platform: row.platform,
        statement: 가린다(row.statement, 비밀) as string,
        notice: `${row.notice}(기대 ${글(row.기대)} / 화면 ${글(row.화면)})`,
      };
    }),
  };
}
