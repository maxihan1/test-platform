import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-124',
  name: '비회원이 「좋아요」를 누르면 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」 모달이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  const 안내 = new 모달(page);
  let 글번호 = 0;

  try {
    await test.step('게시글 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('비회원으로 게시글 상세에서 「좋아요」를 누른다', async () => {
      await 상세.좋아요.click();
      await 안내.뜰때까지();
      await verify(
        '비회원이 「좋아요」를 누르면 「로그인이 필요합니다. 로그인 화면으로 이동할까요?」 모달이 보인다',
        await 안내.창.getByText('로그인이 필요합니다. 로그인 화면으로 이동할까요?', { exact: true }).isVisible(),
        true,
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
