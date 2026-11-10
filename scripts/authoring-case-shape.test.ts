// 케이스 모양 검사 — 기다림 · 케이스 안 화면 요소 · 문구 꼴 (PR #697)
import { describe, expect, it } from 'vitest';

import { 모양확인들, 문구모양, 코드모양 } from './authoring-case-shape.js';
import { 읽기 } from './authoring-held-apply.js';

const 절차 = (몸: string): string => `test(spec, async ({ page }) => {\n  await test.step('누른다', async () => {\n${몸}\n  });\n});\n`;
const 갈래들 = (글: string) => 코드모양(읽기(글)).map((x) => x.갈래);

describe('코드모양 — 기다림', () => {
  it('누른 뒤 기다림 없이 isVisible 을 읽으면 짚는다', () => {
    expect(갈래들(절차(`    await 상세.질문('배송').click();\n    await verify('누르면 답이 보인다', await 상세.답변('2~3일').isVisible(), true);`))).toEqual(['기다림']);
  });

  it('누른 뒤 waitFor · 「때까지」 메서드로 기다리면 넘긴다', () => {
    expect(갈래들(절차(`    await 상세.삭제.click();\n    await 상세.댓글수가될때까지(1);\n    await verify('지우면 안내가 보인다', await 상세.안내.isVisible(), true);`))).toEqual([]);
  });

  it('기다린 그 요소를 verify 에서 isVisible 로 다시 판정하면 짚는다', () => {
    expect(갈래들(절차(`    await 장바구니.담기.click();\n    await 알림.토스트.waitFor();\n    await verify('담으면 토스트가 뜬다', await 알림.토스트.isVisible(), true);`))).toEqual(['기다림']);
  });

  it('기다린 결과를 값으로 바꿔 판정하면 넘긴다', () => {
    expect(
      갈래들(절차(`    await 장바구니.담기.click();\n    const 떴다 = await 알림.토스트.waitFor({ timeout: 10_000 }).then(() => true, () => false);\n    await verify('담으면 토스트가 뜬다', 떴다, true);`)),
    ).toEqual([]);
  });
});

describe('코드모양 — 화면 요소', () => {
  it('케이스 파일 안 getBy · page.goto 를 짚고 Page Object 메서드는 넘긴다', () => {
    const 글 = 절차(`    await page.goto('/board');\n    await 줄.getByRole('button', { name: '수정' }).click();\n    await 게시판.글쓰기();`);
    expect(코드모양(읽기(글)).map((x) => [x.갈래, x.줄])).toEqual([
      ['화면 요소', 3],
      ['화면 요소', 4],
    ]);
  });
});

describe('문구모양', () => {
  const 판정 = (name: string, 판정: string[], tcId = 'ASA-FN-002') => 문구모양({ tcId, name, 판정 }).map((x) => x.글.split(' — ')[0]);

  it('기능 케이스 이름에 「~하면」이 없으면 짚는다 — 「화면」의 「면」은 조건이 아니다', () => {
    expect(판정('「인기글」 화면 목록에 글 5건이 보인다', [])).toEqual(['name 「「인기글」 화면 목록에 글 5건이 보인다」']);
    expect(판정('「인기글」에 들어가면 글 5건이 보인다', [])).toEqual([]);
  });

  it('이름 밖 판정 문장이 조작을 다시 적으면 짚는다 — 이름과 같은 문장 · 결과만 쓴 문장은 넘긴다', () => {
    const name = '아이디를 3자로 적어 가입하면 400 으로 막힌다';
    expect(판정(name, [name, '응답 코드가 400 이다', '아이디를 4자로 적어 가입하면 「accountId」가 돌아온다'])).toEqual(['「아이디를 4자로 적어 가입하면 「accountId」가 돌아온다」']);
  });

  it('UI 케이스는 보지 않는다', () => {
    expect(판정('장바구니 화면에 「삭제」 버튼이 보인다', ['장바구니에서 「삭제」를 누르면 확인 창이 뜬다'], 'MKU-UI-010')).toEqual([]);
  });
});

describe('모양확인들', () => {
  it('볼 tcId 만 줄로 만든다 — 줄 번호가 없는 문구 지적은 줄을 빼고 적는다', () => {
    const 케이스들 = [
      { tcId: 'A-FN-001', 모양: [{ 갈래: '문구' as const, 줄: 0, 글: 'name 「x」 — y' }] },
      { tcId: 'A-FN-002', 모양: [{ 갈래: '기다림' as const, 줄: 7, 글: '「z」 — w' }] },
    ];
    expect(모양확인들(케이스들, new Set(['A-FN-002']))).toEqual(['A-FN-002 7줄 [기다림] 「z」 — w']);
    expect(모양확인들(케이스들)).toHaveLength(2);
  });
});
