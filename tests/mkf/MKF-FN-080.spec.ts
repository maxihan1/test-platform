import { defineCase, test, verify } from '@platform/kit';

import { 글목록제목들 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-080',
  name: '게시판 1쪽에 공지를 뺀 글이 10건 보인다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 1쪽을 연다', async () => {
    await verify('게시판 1쪽에 공지를 뺀 글이 10건 보인다', await 목록.일반행.count(), 10);
  });

  await test.step('게시판 목록 2쪽을 연다', async () => {
    const 열한째제목 = (await 글목록제목들(page.request, 'size=11')).at(10) ?? '';
    await 목록.열기({ page: 2 });
    await 목록.그려질때까지();
    const 둘째쪽 = await 목록.일반행들();
    await verify('최신순 11번째 글은 2쪽 첫 글로 보인다', 열한째제목 !== '' && 둘째쪽.at(0)?.제목 === 열한째제목, true);
  });
});
