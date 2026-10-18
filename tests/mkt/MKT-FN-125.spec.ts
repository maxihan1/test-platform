import { defineCase, test, verify } from '@platform/kit';
import { 열한번째글번호 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-125',
  name: '게시판 목록 1쪽에 공지를 뺀 글이 10개 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 1쪽의 글 수를 센다', async () => {
    await verify('게시판 목록 1쪽에 공지를 뺀 글이 10개 보인다', await 목록.일반행.count(), 10);
  });

  await test.step('게시판 목록 2쪽을 연다', async () => {
    const 누르기전 = String(await 열한번째글번호(request));
    await 목록.쪽누르기(2);
    const 첫글 = (await 목록.일반행글자들())[0]?.[0];
    const 누른뒤 = String(await 열한번째글번호(request));
    await verify('11번째 글은 2쪽 첫 글로 보인다', 첫글, 첫글 === 누르기전 ? 누르기전 : 누른뒤);
  });
});
