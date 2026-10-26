import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 클립보드준비, 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-127',
  name: '「링크 복사」를 누르면 클립보드에 그 글 주소가 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 게시글상세화면(page);
  const 알림 = new 토스트(page);
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

    await test.step('클립보드 권한을 준 채 「링크 복사」를 누른다', async () => {
      const 클립보드읽기 = await 클립보드준비(page);
      await 상세.열기(글번호);
      await 상세.링크복사.click();
      await 알림.글('링크를 복사했습니다').waitFor();
      await verify('「링크 복사」를 누르면 클립보드에 그 글 주소가 들어간다', await 클립보드읽기(), page.url());
    });

    await test.step('「링크 복사」를 누른 뒤 토스트를 확인한다', async () => {
      await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 알림.글('링크를 복사했습니다').isVisible(), true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(request, 글번호);
  }
});
