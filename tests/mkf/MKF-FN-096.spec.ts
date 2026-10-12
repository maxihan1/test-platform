import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-096',
  name: '상세에서 「목록」을 누르면 분류 「질문」 2쪽 목록으로 돌아간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('분류 「질문」 2쪽 목록을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.분류탭('질문').click();
    await 목록.선택된분류탭('질문').waitFor();
    await 목록.그려질때까지();
    await 목록.번호버튼(2).click();
    await 목록.그려질때까지();
  });

  await test.step('분류 「질문」 2쪽이 열렸는지 확인한다', async () => {
    await verify('분류 「질문」 2쪽 목록이 열려 있다', (await 목록.선택된분류탭('질문').isVisible()) && (await 목록.현재페이지()) === '2', true, { blocker: true });
  });

  await test.step('분류 「질문」 2쪽에서 글을 열고 상세 아래 「목록」을 누른다', async () => {
    await 목록.첫글열기();
    await 상세.그려질때까지();
    await 상세.목록.click();
    await 목록.그려질때까지();
    await verify('상세에서 「목록」을 누르면 분류 「질문」 2쪽 목록으로 돌아간다', (await 목록.선택된분류탭('질문').isVisible()) && (await 목록.현재페이지()) === '2', true);
  });
});
