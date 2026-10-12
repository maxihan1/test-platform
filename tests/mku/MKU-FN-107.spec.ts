import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-107',
  name: '좋아요 확인 모달에서 「이동」을 누르면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 팝업 = new 모달(page);
  const 로그인 = new 로그인화면(page);
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

  await test.step('좋아요 확인 모달에서 「이동」을 누른다', async () => {
    await 팝업.버튼('이동').click();
    await 로그인.제목.waitFor();
    await verify('좋아요 확인 모달에서 「이동」을 누르면 로그인 화면으로 간다', await 로그인.제목.isVisible(), true);
  });
});
