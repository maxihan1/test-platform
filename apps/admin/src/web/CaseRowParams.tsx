// 케이스 줄 안의 입력 칸 (SPEC §8.1). 그리는 일은 Form 이 하고 여기는 몇 개를 보일지만 정한다
//
// **칸을 새로 그리지 않는다.** Form 이 이미 enum 고르개 · 예/아니오 · 비밀값 가림 ·
// autoComplete="new-password" · 「기본값 … 에서 바꿈」 줄을 들고 있다.
// 새로 그리면 그 넷이 조용히 빠지고, 빠진 것 중 하나는 이 관리 화면의 로그인 비밀번호가
// 테스트 입력값으로 서버에 가는 길이다 (Form.tsx 의 autoComplete 주석).

import type { JsonSchema } from './api.js';
import { Form } from './Form.js';
import { use말 } from './i18n.js';
import { type Field, initialText, schemaToFields } from './schema.js';

/**
 * 줄에 보이는 칸 수의 상한 (2026-09-21 결정).
 *
 * DESIGN.md 「폼 자동 생성 규칙」은 「8개를 넘으면 구획을 나눈다」고 정하는데
 * **목록 줄에서는 구획을 나눌 수 없다.** 그래서 줄에는 넷까지만 두고 나머지는 상세로 넘긴다.
 * 확정 목업이 그린 것은 3칸짜리 케이스이고 9칸짜리는 목업이 답한 적이 없다.
 */
export const 줄에보일칸수 = 4;

/** 케이스마다 고쳐 넣은 글자. 안 고친 칸은 여기 아예 없고 코드의 기본값으로 돈다 (SPEC §8.10) */
export interface 줄글자 {
  params: Record<string, string>;
  expected: Record<string, string>;
}

type 자리 = 'params' | 'expected';

const 오류없음: Record<string, string> = {};

/**
 * 줄에 낼 수 있는 칸인가.
 *
 * **객체·배열 기본값은 줄에서 뺀다.** Form 은 그런 기본값을 `JSON.stringify` 로 펴는데
 * (`Form.tsx` 의 `기본값글자`), 목록 화면에 JSON 원문을 내는 것은 금지다 (DESIGN.md 「금지」 · SPEC §8.1).
 * 한 줄짜리 입력칸에서 고칠 수 있는 모양도 아니다 — 상세로 넘긴다.
 */
function 줄에낼수있나(field: Field): boolean {
  return field.default === null || typeof field.default !== 'object';
}

/** 고친 값이 있으면 그것을, 없으면 코드의 기본값을 보여준다. undefined 를 펴면 아무 일도 안 난다 */
const 채운글자 = (fields: Field[], 고친: Record<string, string> | undefined): Record<string, string> => ({
  ...initialText(fields),
  ...고친,
});

export function CaseRowParams({
  tcId,
  paramSchema,
  expectedSchema,
  글자,
  on값,
  on더보기,
}: {
  tcId: string;
  paramSchema: JsonSchema;
  expectedSchema: JsonSchema;
  글자?: 줄글자;
  on값: (어디: 자리, key: string, value: string) => void;
  /** 넘친 칸을 보러 간다. 상세 펼침이 같은 자리를 연다 */
  on더보기: () => void;
}) {
  const t = use말();
  const 입력값 = schemaToFields(paramSchema);
  const 기대결과 = schemaToFields(expectedSchema);
  const 전체 = 입력값.length + 기대결과.length;

  // 펼 것이 없으면 자리를 만들지 않는다. 빈 네모가 줄마다 생기면 목록이 성기게 보인다
  if (전체 === 0) return null;

  const 낼입력값 = 입력값.filter(줄에낼수있나);
  const 낼기대결과 = 기대결과.filter(줄에낼수있나);
  const 보일입력값 = 낼입력값.slice(0, 줄에보일칸수);
  const 보일기대결과 = 낼기대결과.slice(0, Math.max(0, 줄에보일칸수 - 보일입력값.length));
  const 남은 = 전체 - 보일입력값.length - 보일기대결과.length;

  return (
    <div className="pcell">
      {보일입력값.length === 0 ? null : (
        <Form
          idPrefix={`row-${tcId}-p`}
          fields={보일입력값}
          text={채운글자(입력값, 글자?.params)}
          errors={오류없음}
          onChange={(key, value) => on값('params', key, value)}
        />
      )}
      {보일기대결과.length === 0 ? null : (
        <Form
          idPrefix={`row-${tcId}-e`}
          fields={보일기대결과}
          text={채운글자(기대결과, 글자?.expected)}
          errors={오류없음}
          onChange={(key, value) => on값('expected', key, value)}
        />
      )}
      {남은 === 0 ? null : (
        <button type="button" className="pmore" onClick={on더보기}>
          {t('{개수}개 더', { 개수: 남은 })}
        </button>
      )}
    </div>
  );
}
