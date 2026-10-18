import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-134',
  name: '분류 · 정렬 · 페이지를 바꾸고 새로 고쳐도 같은 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('분류 「질문」 · 정렬 「조회순」 · 2쪽으로 바꾼 뒤 새로 고친다', async () => {
    await 목록.탭누르기('질문');
    await 목록.정렬고르기('조회순');
    await 목록.쪽누르기(2);
    const 앞 = (await 목록.행글자들()).map((칸) => 칸[0]).sort().join(', ');
    await 목록.새로고침();
    const 뒤 = (await 목록.행글자들()).map((칸) => 칸[0]).sort().join(', ');
    await verify('분류 · 정렬 · 페이지를 바꾸고 새로 고쳐도 같은 목록이 보인다', 뒤, 앞);
  });

  await test.step('분류를 「후기」로 바꾼 뒤 뒤로 가기를 한다', async () => {
    await 목록.탭누르기('후기');
    await page.goBack();
    await 목록.선택된탭.filter({ hasText: '질문' }).waitFor();
    await 목록.내용그려질때까지();
    const 분류들 = (await 목록.일반행글자들()).map((칸) => 칸[1]);
    await verify('뒤로 가기를 하면 앞의 분류 「질문」 목록이 보인다', [...new Set(분류들)].join(', '), '질문');
  });
});
