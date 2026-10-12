import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-108',
  name: '좋아요 확인 모달에서 「취소」를 누르면 게시글 상세에 그대로 머문다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 팝업 = new 모달(page);
  await 방해막기(page);

  await test.step('게시글 상세에서 「좋아요」를 눌러 확인 모달을 띄운다', async () => {
    await 상세.열기(1);
    await 상세.그려질때까지();
    await 상세.좋아요.click();
  });

  await test.step('좋아요 확인 모달이 떴는지 확인한다', async () => {
    await 팝업.창.waitFor();
    await verify('좋아요 확인 모달이 떠 있다', await 팝업.창.isVisible(), true, { blocker: true });
  });

  await test.step('좋아요 확인 모달에서 「취소」를 누른다', async () => {
    await 팝업.버튼('취소').click();
    await 팝업.창.waitFor({ state: 'detached' });
    await verify('좋아요 확인 모달에서 「취소」를 누르면 게시글 상세에 그대로 머문다', (await 상세.제목.isVisible()) && new URL(page.url()).pathname === '/board/1', true);
  });
});
