import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 로그인화면 } from './pages/login.page.js';

type 글요약 = { id: number };

export const spec = defineCase({
  tcId: 'MKT-FN-049',
  name: '비회원이 「좋아요」를 누르면 확인 모달이 뜨고 「취소」는 머물고 「이동」은 로그인으로 간다',
  precondition: ['비회원이다', '좋아요 확인 모달이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 확인창 = new 모달(page);
  const 글들 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 대상 = 글들[글들.length - 3]?.id ?? 0;

  await test.step('게시글 상세에서 「좋아요」를 누른다', async () => {
    await 상세.열기(대상);
    await 상세.댓글제목().waitFor();
    await 상세.좋아요누르기();
    await 확인창.버튼('이동').waitFor();
    await verify(
      '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
      await 상세.좋아요확인문구().isVisible(),
      true,
    );
  });

  await test.step('「취소」를 누른다', async () => {
    await 확인창.버튼('취소').click();
    await 확인창.창().waitFor({ state: 'detached' });
    await verify(
      '「취소」를 누르면 상세 화면에 그대로 머문다',
      { 경로: new URL(page.url()).pathname, 제목: await 상세.제목().isVisible() },
      { 경로: `/board/${대상}`, 제목: true },
    );
  });

  await test.step('「이동」을 누른다', async () => {
    await 상세.좋아요누르기();
    await 확인창.버튼('이동').waitFor();
    await verify('좋아요 확인 모달이 열려 있다', await 확인창.창().isVisible(), true, { blocker: true });
    await 확인창.버튼('이동').click();
    await new 로그인화면(page).아이디칸().waitFor();
    await verify(
      '「이동」을 누르면 로그인 화면으로 간다',
      { 경로: new URL(page.url()).pathname, 로그인버튼: await new 로그인화면(page).로그인버튼().isVisible() },
      { 경로: '/login', 로그인버튼: true },
    );
  });
});
