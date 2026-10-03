// 케이스 품질 숫자 검사 — 판정 수 · 전제 확인 · 공용 부품 밖 CSS/XPath · 여러 파일에 따로 만든 도우미
import { describe, expect, it } from 'vitest';

import { 품질숫자, 품질줄 } from './authoring-quality.js';

const 케이스 = (몸: string) => `import { defineCase } from '@platform/kit';\n${몸}\n`;

describe('품질 숫자 (작성 §3.6 · 2026-10-03 — 나눠 쓴 뒤 품질을 숫자로 견준다)', () => {
  it('케이스 수 · 판정 평균 · 전제 확인 비율을 센다', () => {
    const 숫자 = 품질숫자([
      { 경로: 'tests/mkt/MKT-FN-001.spec.ts', 글: 케이스("await verify('a', 1, 1, { blocker: true });\nawait verify('b', 1, 1);") },
      { 경로: 'tests/mkt/MKT-FN-002.spec.ts', 글: 케이스("await verify('c', 1, 1);") },
      { 경로: 'tests/mkt/pages/home.page.ts', 글: "verify('페이지 안의 것은 세지 않는다')" },
    ]);
    expect(숫자).toMatchObject({ 케이스: 2, 판정평균: 1.5, 전제확인비율: 0.5 });
  });

  it('공용 부품(components) 밖의 CSS · XPath locator 만 센다', () => {
    const 숫자 = 품질숫자([
      { 경로: 'tests/mkt/pages/home.page.ts', 글: "page.locator('.toast'); page.locator(\"#modal\"); page.locator('//div'); page.getByRole('button')" },
      { 경로: 'tests/mkt/components/toast.component.ts', 글: "page.locator('.toast')" },
      { 경로: 'tests/mkt/MKT-FN-001.spec.ts', 글: 케이스("page.locator('[data-x]'); page.locator('css=a'); page.locator('xpath=//a')") },
    ]);
    expect(숫자.밖CSS).toBe(6);
  });

  it('둘 이상의 케이스 파일에 같은 이름으로 만든 도우미를 센다 — 묶음마다 따로 만든 흔적', () => {
    const 숫자 = 품질숫자([
      { 경로: 'tests/mkt/MKT-FN-001.spec.ts', 글: 케이스('async function 가입한다(request) {}\nconst 탈퇴로치운다 = async () => {};') },
      { 경로: 'tests/mkt/MKT-FN-002.spec.ts', 글: 케이스('async function 가입한다(request, 아이디) {}') },
      { 경로: 'tests/mkt/MKT-FN-003.spec.ts', 글: 케이스('const 탈퇴로치운다 = async () => {};\nfunction 혼자쓴다() {}') },
    ]);
    expect(숫자.겹친도우미).toEqual(['가입한다', '탈퇴로치운다']);
  });

  it('한 줄로 — PR 본문 작성 요약 머리에 싣는다', () => {
    const 줄 = 품질줄({ 케이스: 141, 판정평균: 3.81, 전제확인비율: 0.496, 밖CSS: 105, 겹친도우미: ['가입한다', '치운다'] });
    expect(줄).toBe('품질 숫자: 케이스 141 · 판정 평균 3.8 · 전제 확인 50% · 공용 부품 밖 CSS·XPath 105 · 여러 파일에 따로 만든 도우미 2개(가입한다 · 치운다)');
  });

  it('케이스가 없으면 평균 · 비율은 0', () => {
    expect(품질숫자([])).toMatchObject({ 케이스: 0, 판정평균: 0, 전제확인비율: 0 });
  });
});
