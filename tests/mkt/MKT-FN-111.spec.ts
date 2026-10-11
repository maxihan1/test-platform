import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-111',
  name: '상세에서 「목록」을 누르면 들어오기 전 「자유」 탭 2페이지 목록으로 돌아간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  await 방해막기(page);

  await test.step('「자유」 탭 2페이지 목록을 연다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.분류탭('자유').click();
    await 목록.그려질때까지();
    await 목록.번호버튼(2).click();
    await 목록.그려질때까지();
  });

  await test.step('「자유」 탭 2페이지가 열렸는지 확인한다', async () => {
    await verify('「자유」 탭 2페이지 목록이 열려 있다', (await 목록.선택된분류탭('자유').isVisible()) && (await 목록.현재페이지()) === '2', true, { blocker: true });
  });

  await test.step('「자유」 탭 2페이지에서 글을 열고 「목록」을 누른다', async () => {
    await 목록.첫글열기();
    await 상세.그려질때까지();
    await 상세.목록.click();
    await 목록.그려질때까지();
    await verify('상세에서 「목록」을 누르면 들어오기 전 「자유」 탭 2페이지 목록으로 돌아간다', (await 목록.선택된분류탭('자유').isVisible()) && (await 목록.현재페이지()) === '2', true);
  });
});
