import { defineCase, test, verify } from '@platform/kit';

import { 글목록제목들 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-087',
  name: '분류 · 정렬 · 쪽을 바꾼 목록을 새로 고쳐도 주소창 값과 같은 목록이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  const 주소값 = (이름: string): string | null => new URL(page.url()).searchParams.get(이름);
  const 자료조건 = `category=${encodeURIComponent('질문')}&sort=views&page=2`;

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('분류 「질문」 · 정렬 「조회순」 · 2쪽으로 바꾼 뒤 새로 고친다', async () => {
    await 목록.분류탭('질문').click();
    await 목록.선택된분류탭('질문').waitFor();
    await 목록.그려질때까지();
    await 목록.정렬고르기('조회순');
    await 목록.그려질때까지();
    await 목록.번호버튼(2).click();
    await 목록.그려질때까지();
    await page.reload();
    await 목록.그려질때까지();
    const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    await verify(
      '분류 · 정렬 · 쪽을 바꾼 목록을 새로 고쳐도 주소창 값과 같은 목록이 보인다',
      {
        주소: [주소값('category'), 주소값('sort'), 주소값('page')],
        고른것: [await 목록.선택된분류탭('질문').isVisible(), await 목록.선택된정렬(), await 목록.현재페이지()],
        목록: 제목들.join(' | '),
      },
      { 주소: ['질문', 'views', '2'], 고른것: [true, '조회순', '2'], 목록: (await 글목록제목들(page.request, 자료조건)).join(' | ') },
    );
  });

  await test.step('분류 「질문」을 고른 뒤 글을 열고 뒤로 가기를 한다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    await 목록.분류탭('질문').click();
    await 목록.선택된분류탭('질문').waitFor();
    await 목록.그려질때까지();
    const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    await 목록.첫글열기();
    await 상세.그려질때까지();
    await page.goBack();
    await 목록.그려질때까지();
    const 돌아온제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    await verify('뒤로 가기를 하면 분류 「질문」 목록이 그대로 보인다', (await 목록.선택된분류탭('질문').isVisible()) && 돌아온제목들.join(' | ') === 제목들.join(' | '), true);
  });
});
