// 「판정이 아닌 결과」를 가르는 한 곳이 사유 글자를 명세대로 가르는지 본다 (도메인/실행 §3.2 「판정이 아닌 결과 — 한 곳에서 가른다」)

import { describe, expect, it } from 'vitest';

import { Blocked줄, 멈춰닫힌항목아님, 판정난줄, 판정아닌까닭을가른다 } from './notVerdict.js';

describe('판정이 아닌 결과', () => {
  it('통과 · 실패는 판정이라 까닭이 없다', () => {
    expect(판정아닌까닭을가른다('PASS', undefined)).toBeNull();
    expect(판정아닌까닭을가른다('FAIL', 'TIMEOUT')).toBeNull();
  });

  it('미실행은 사유 글자로 가르고 모르는 글은 그 밖으로 본다', () => {
    for (const 까닭 of ['BLOCKED', 'ABORTED', 'PREP_FAILED', 'TIMEOUT', 'PROCEDURE_CHANGED']) {
      expect(판정아닌까닭을가른다('NA', 까닭)).toBe(까닭);
    }
    expect(판정아닌까닭을가른다('NA', '러너에 닿지 못했습니다')).toBe('OTHER');
    expect(판정아닌까닭을가른다('NA', null)).toBe('OTHER');
    expect(판정아닌까닭을가른다('NA', undefined)).toBe('OTHER');
  });

  it('세는 질의의 조건은 별칭을 받는다', () => {
    expect(판정난줄('s')).toBe("s.status IN ('PASS', 'FAIL')");
    expect(Blocked줄('i')).toBe("(i.status = 'NA' AND i.error->>'message' = 'BLOCKED')");
    expect(멈춰닫힌항목아님()).toBe("NOT (status = 'NA' AND error->>'message' IN ('ABORTED', 'PREP_FAILED'))");
  });
});
