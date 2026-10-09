// 실행 창이 케이스마다 들고 있는 칸 글자 — 목록 줄과 같은 표에서 시작해 창 안에서 고친다 (도메인/실행 §8.10)
// 창(RunPickModal)이 300줄을 넘어 뺐다. 그리는 일은 없다

import { useMemo, useState } from 'react';

import type { CaseRow } from './api.js';
import { 채운글자 } from './CaseRowParams.js';
import type { 고친값표, 글자표 } from './pickRun.js';
import { type Field, schemaToFields, toValues } from './schema.js';
import { fieldErrors } from './validation.js';

type 갈래 = 'params' | 'expected';
type 칸글자 = { params: Record<string, string>; expected: Record<string, string> };
export type 칸오류표 = Record<string, 칸글자 | undefined>;

/**
 * @param 초기글자 목록 줄에서 이미 고쳐 둔 값(2026-09-21 ②) · 지난 실행의 값. **두 자리가 같은 표를 쓴다** —
 *   안 실어 오면 고친 값이 창을 여는 순간 사라지고, 사람은 고친 줄 알고 기본값으로 돌린 결과를 증적으로 제출한다
 * @param 손댐 사람이 뭔가 손댔다. 창은 방금 누른 것에 대한 답과 옛 사유를 함께 치운다
 */
export function useRunPickValues(케이스들: CaseRow[], 초기글자: 글자표 | undefined, 손댐: () => void) {
  const [글자, set글자] = useState<글자표>(초기글자 ?? {});

  const 칸들 = useMemo(
    () =>
      new Map<string, { params: Field[]; expected: Field[] }>(
        케이스들.map((c) => [
          c.tcId,
          {
            params: schemaToFields(c.paramSchema, c.savedInput?.params, c.savedInput?.savedSecrets.params),
            expected: schemaToFields(c.expectedSchema, c.savedInput?.expected, c.savedInput?.savedSecrets.expected),
          },
        ]),
      ),
    [케이스들],
  );

  const 고친값 = useMemo<고친값표>(() => {
    const 표: 고친값표 = {};
    for (const [tcId, text] of Object.entries(글자)) {
      const 칸 = 칸들.get(tcId);
      if (text === undefined || 칸 === undefined) continue;
      // 목록 줄의 `글자` 는 고친 칸만 든다. 조각에 바로 toValues 를 걸면 안 고친 칸이 "" · false 로 나간다 (2026-09-29)
      표[tcId] = {
        params: toValues(칸.params, 채운글자(칸.params, text.params)),
        expected: toValues(칸.expected, 채운글자(칸.expected, text.expected)),
      };
    }
    return 표;
  }, [글자, 칸들]);

  /**
   * 고친 값만 명세로 검사한다 (§8.2). 안 고친 케이스는 코드 기본값으로 돌고 §4 K10 이 그 값을 이미 지킨다.
   * 비워 둔 비밀값 칸에 저장값이 있으면 막지 않는다 — 칸이 그 사실을 들고 있어 서버가 저장값으로 채운다
   */
  const 오류 = useMemo<칸오류표>(() => {
    const 표: 칸오류표 = {};
    for (const c of 케이스들) {
      const 값 = 고친값[c.tcId];
      const 칸 = 칸들.get(c.tcId);
      if (값 === undefined || 칸 === undefined) continue;
      const params = fieldErrors(c.paramSchema, 값.params ?? {}, 칸.params);
      const expected = fieldErrors(c.expectedSchema, 값.expected ?? {}, 칸.expected);
      if (Object.keys(params).length + Object.keys(expected).length > 0) 표[c.tcId] = { params, expected };
    }
    return 표;
  }, [케이스들, 고친값, 칸들]);

  /**
   * 칸이 들고 있어야 할 글자. 아직 손대지 않았으면 코드가 선언한 기본값이다.
   *
   * **2026-09-21 에 접개를 없애면서 「처음 펼 때 채운다」가 「처음부터 채워 둔다」가 됐다** —
   * 값이 한 뎁스 안에 있으면 무엇을 돌리는지 보려고 케이스마다 한 번씩 눌러야 한다 (SPEC §8.10).
   */
  function 글자of(tcId: string, which: 갈래): Record<string, string> {
    const 칸 = 칸들.get(tcId);
    return 채운글자((which === 'params' ? 칸?.params : 칸?.expected) ?? [], 글자[tcId]?.[which]);
  }

  /** 고친 칸 조각이 아니라 채운 글자에서 시작한다 — 표에 든 값이 곧 화면에 보이는 값이어야 한다 */
  function 지금글자(전: 글자표, tcId: string): 칸글자 {
    const 칸 = 칸들.get(tcId);
    return {
      params: 채운글자(칸?.params ?? [], 전[tcId]?.params),
      expected: 채운글자(칸?.expected ?? [], 전[tcId]?.expected),
    };
  }

  function 고치기(tcId: string, which: 갈래) {
    return (key: string, value: string) => {
      손댐();
      set글자((전) => {
        const 지금 = 지금글자(전, tcId);
        return { ...전, [tcId]: { ...지금, [which]: { ...지금[which], [key]: value } } };
      });
    };
  }

  /** 입력값 묶음을 불러왔다. 묶음에 없는 칸은 지금 글자를 그대로 둔다 — 통째로 갈면 스키마가 늘었을 때 칸이 빈다 */
  function 불러오기(tcId: string, 값: 칸글자) {
    손댐();
    set글자((전) => {
      const 지금 = 지금글자(전, tcId);
      return { ...전, [tcId]: { params: { ...지금.params, ...값.params }, expected: { ...지금.expected, ...값.expected } } };
    });
  }

  return { 칸들, 고친값, 오류, 글자of, 고치기, 불러오기 };
}
