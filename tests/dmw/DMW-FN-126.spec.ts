import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 화면제목 } from './components/page-heading.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-126',
  name: '로그인 필요 모달에서 「이동」을 누르면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  const 안내 = new 모달(page);
  const 제목 = new 화면제목(page);
  let 글번호 = 0;

  try {
    await test.step('게시글 상세 화면을 열고 「좋아요」를 눌러 로그인 필요 모달을 띄운다', async () => {
      const 글 = await 일회용회원의글만들기(request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await 상세.좋아요.click();
      await 안내.뜰때까지();
      await verify('로그인 필요 모달이 보인다', await 안내.창.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 필요 모달에서 「이동」을 누른다', async () => {
      await 안내.버튼('이동').click();
      await 제목.글('로그인').waitFor();
      await verify('로그인 필요 모달에서 「이동」을 누르면 로그인 화면으로 간다', await 제목.글('로그인').isVisible(), true);
    });

    await test.step('게시글 상세 화면을 다시 열고 로그인 필요 모달을 띄운다', async () => {
      await 상세.열기(글번호);
      await 상세.좋아요.click();
      await 안내.뜰때까지();
      await verify('로그인 필요 모달이 다시 보인다', await 안내.창.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 필요 모달에서 「취소」를 누른다', async () => {
      await 안내.버튼('취소').click();
      await 안내.사라질때까지();
      const 글제목 = await verify('게시글 상세의 제목이 보인다', await 상세.제목.isVisible(), true);
      const 주소 = await verify('게시글 상세 주소에 그대로 있다', new URL(page.url()).pathname, `/board/${글번호}`);
      await verify('로그인 필요 모달에서 「취소」를 누르면 게시글 상세에 그대로 있다', 글제목 && 주소, true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
