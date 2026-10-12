import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-089',
  name: '「자유」 탭을 누르면 공지를 뺀 글이 모두 「자유」 분류로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 「자유」 탭을 누른다', async () => {
    await 목록.분류탭('자유').click();
    await 목록.그려질때까지();
    const 분류들 = (await 목록.일반행들()).map((행) => 행.분류);
    await verify('「자유」 탭을 누르면 공지를 뺀 글이 모두 「자유」 분류로 보인다', 분류들.length > 0 && 분류들.every((분류) => 분류 === '자유'), true);
  });
});
