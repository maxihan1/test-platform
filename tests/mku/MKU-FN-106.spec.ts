import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-106',
  name: '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 팝업 = new 모달(page);
  await 방해막기(page);

  await test.step('게시글 상세 화면을 연다', async () => {
    await 상세.열기(1);
  });

  await test.step('게시글 상세 화면이 열렸는지 확인한다', async () => {
    await 상세.그려질때까지();
    await verify('게시글 상세 화면이 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시글 상세에서 「좋아요」를 누른다', async () => {
    await 상세.좋아요.click();
    await 팝업.창.waitFor();
    await verify('비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 보인다', await 팝업.본문.innerText(), '로그인이 필요합니다. 로그인 화면으로 이동할까요?');
  });
});
