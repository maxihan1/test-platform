import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-099',
  name: '「자유」 탭 2페이지에서 새로 고쳐도 같은 목록이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  let 처음제목들: string[] = [];
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「자유」 탭 2페이지에서 새로 고친다', async () => {
    await 목록.분류탭('자유').click();
    await 목록.그려질때까지();
    await 목록.번호버튼(2).click();
    await 목록.그려질때까지();
    처음제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    await page.reload();
    await 목록.그려질때까지();
    const 지금제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    const 탭과쪽이같다 = (await 목록.선택된분류탭('자유').isVisible()) && (await 목록.현재페이지()) === '2';
    await verify('「자유」 탭 2페이지에서 새로 고쳐도 같은 목록이 보인다', 탭과쪽이같다 && 처음제목들.length > 0 && 지금제목들.join(' | ') === 처음제목들.join(' | '), true);
  });

  await test.step('「자유」 탭 2페이지에서 글을 연 뒤 뒤로 간다', async () => {
    await 목록.첫글열기();
    await 상세.그려질때까지();
    await page.goBack();
    await 목록.그려질때까지();
    const 지금제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    const 탭과쪽이같다 = (await 목록.선택된분류탭('자유').isVisible()) && (await 목록.현재페이지()) === '2';
    await verify('「자유」 탭 2페이지에서 뒤로 가기로 돌아와도 같은 목록이 보인다', 탭과쪽이같다 && 지금제목들.join(' | ') === 처음제목들.join(' | '), true);
  });
});
