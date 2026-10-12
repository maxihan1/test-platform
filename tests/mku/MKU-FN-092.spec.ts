import { defineCase, test, verify } from '@platform/kit';

import { 글목록제목들 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-092',
  name: '게시판 목록 첫 페이지에는 공지를 뺀 글이 10건 보인다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  let 열한째제목 = '';
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 첫 페이지를 연다', async () => {
    await verify('게시판 목록 첫 페이지에는 공지를 뺀 글이 10건 보인다', await 목록.일반행.count(), 10);
  });

  await test.step('게시판 목록 2페이지로 간다', async () => {
    열한째제목 = (await 글목록제목들(page.request, 'size=11')).at(10) ?? '';
    await 목록.열기({ page: 2 });
    await 목록.그려질때까지();
    const 둘째쪽 = await 목록.일반행들();
    await verify('첫 페이지에 들지 않은 11번째 글은 2페이지 첫 줄에 보인다', 열한째제목 !== '' && 둘째쪽.at(0)?.제목 === 열한째제목, true);
  });
});
