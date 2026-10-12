import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-003',
  name: '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 팝업 = new 모달(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('공지 글 상세에서 「좋아요」를 누른다', async () => {
    await 방해막기(page);
    await 상세.열기(1);
    await 상세.그려질때까지();
    await verify('공지 글 상세가 열려 있다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.좋아요.click();
    await 팝업.창.waitFor();
    await verify(
      '비회원이 「좋아요」를 누르면 확인 모달 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」가 뜬다',
      await 팝업.본문.innerText(),
      '로그인이 필요합니다. 로그인 화면으로 이동할까요?',
    );
  });

  await test.step('공지 글 상세를 연다', async () => {
    await 상세.열기(1);
    await 상세.댓글까지그려질때까지();
    await verify(
      '비회원이 연 게시글 상세에는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
      (await 상세.로그인안내링크.isVisible()) && !(await 상세.새댓글입력.isVisible()),
      true,
    );
  });
});
