// 작업방 상태 글에서 올릴 파일 · 지울 새 파일을 고르는 순수 함수 검사
import { describe, expect, it } from 'vitest';

import { 바뀐파일들, 지운말, 치울새파일들 } from './authoring-status.js';

describe('치울 새 파일 — tests · docs 밖에 자식이 새로 남긴 것 (작성 §3.6 · 2026-10-03)', () => {
  const z = (...줄: string[]) => 줄.join('\0') + '\0';

  it('tests · docs 밖의 추적 안 된 파일만 고른다', () => {
    expect(치울새파일들(z('?? $로그', '?? tmp/x.log', '?? tests/mkt/a.spec.ts', '?? docs/cases/MKT.md'))).toEqual([
      '$로그',
      'tmp/x.log',
    ]);
  });

  it('고친 파일 · 지운 파일은 고르지 않는다 — 판정이 거절한다', () => {
    expect(치울새파일들(z(' M package.json', ' D scripts/a.ts', 'A  b.txt'))).toEqual([]);
  });

  it('첫 마디가 정확히 tests · docs 여야 한다', () => {
    expect(치울새파일들(z('?? testsX/a', '?? tests', '?? docsy.md', '?? docs'))).toEqual(['testsX/a', 'docsy.md']);
  });

  it('안쪽 저장소(/ 로 끝남) · .. · 절대 경로는 안 고른다', () => {
    expect(치울새파일들(z('?? inner/', '?? ../x', '?? /etc/x', '?? a/../b'))).toEqual([]);
  });

  it('따옴표 · 줄바꿈 · 공백이 든 이름도 그대로 낸다(-z)', () => {
    expect(치울새파일들(z('?? "a b".log', '?? 줄\n바꿈'))).toEqual(['"a b".log', '줄\n바꿈']);
  });

  it('빈 출력이면 빈 목록이다', () => {
    expect(치울새파일들('')).toEqual([]);
  });
});

describe('지운 말 — 작성 요약 머리에 싣는 경고 한 줄', () => {
  it('지운 것이 없으면 싣지 않는다', () => {
    expect(지운말([])).toBeNull();
  });

  it('경고로 시작하고 개수와 이름을 싣는다', () => {
    const 말 = 지운말(['$로그', 'tmp/x.log']);
    expect(말).toMatch(/^⚠️ 케이스 밖 새 파일 2개를 지우고 올렸다/);
    expect(말).toContain('$로그 · tmp/x.log');
  });

  it('열 개까지만 싣고 나머지는 「외 N개」 — 머리가 PR 본문을 깎지 않게', () => {
    const 말 = 지운말(Array.from({ length: 2000 }, (_, i) => `report/${i}.html`))!;
    expect(말).toContain('2000개');
    expect(말).toContain('외 1990개');
    expect(말).not.toContain('report/10.html');
    expect(말.length).toBeLessThan(500);
  });

  it('이름의 줄바꿈은 ⏎ 로 — 가짜 로그 줄 · 마크다운 줄이 되지 않게', () => {
    expect(지운말(['a\n[작성] 가짜'])).not.toContain('\n');
  });
});

describe('바뀐 파일 — 자식이 남긴 것을 작업방 상태에서 읽는다', () => {
  it('새 파일·고친 파일·지운 파일을 다 잡는다', () => {
    const 글 = '?? tests/todo/TODO-009.spec.ts\n M docs/cases/TODO.md\n D tests/todo/TODO-001.spec.ts\n';
    expect(바뀐파일들(글)).toEqual(['tests/todo/TODO-009.spec.ts', 'docs/cases/TODO.md', 'tests/todo/TODO-001.spec.ts']);
  });

  it('이름을 바꾼 것은 옛 이름과 새 이름을 둘 다 낸다 — 옛 자리가 지워진 것도 올려야 한다', () => {
    expect(바뀐파일들('R  tests/todo/a.spec.ts -> tests/todo/b.spec.ts\n')).toEqual([
      'tests/todo/a.spec.ts',
      'tests/todo/b.spec.ts',
    ]);
  });

  it('빈 출력이면 빈 목록이다', () => {
    expect(바뀐파일들('')).toEqual([]);
  });
});
