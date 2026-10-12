import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글쓴이정리하기, 글있나, 글하나쓰기, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-112',
  name: '삭제 모달에서 「삭제」를 누르면 게시판 목록으로 간다',
  precondition: ['회원으로 로그인해 내 글을 하나 썼다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 목록 = new 게시판목록화면(page);
  const 팝업 = new 모달(page);
  const 알림 = new 토스트(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 글번호 = 0;
  let 제목 = '';
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      const 글 = await 글하나쓰기(나.api, '삭제글');
      글번호 = 글.id;
      제목 = 글.제목;
    });

    await test.step('회원이 쓴 글이 있는지 확인한다', async () => {
      await verify('회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('내 글 상세에서 삭제 모달을 띄운다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await 상세.삭제.click();
    });

    await test.step('삭제 모달이 떴는지 확인한다', async () => {
      await 팝업.창.waitFor();
      await verify('삭제 모달이 떠 있다', await 팝업.창.isVisible(), true, { blocker: true });
    });

    await test.step('삭제 모달에서 「삭제」를 누른다', async () => {
      await 팝업.버튼('삭제').click();
      await 목록.제목.waitFor();
      await 알림.글('삭제되었습니다').first().waitFor();
      await verify('삭제 모달에서 「삭제」를 누르면 게시판 목록으로 간다', new URL(page.url()).pathname === '/board' && (await 목록.제목.isVisible()), true);
      await verify('글을 지우면 토스트 「삭제되었습니다」가 보인다', await 알림.글('삭제되었습니다').first().isVisible(), true);
      await 목록.열기({ q: 제목 });
      await 목록.그려질때까지();
      await verify('지운 글은 게시판 목록에 보이지 않는다', await 목록.제목링크(제목).count(), 0);
    });
  } finally {
    await 정리.모두하기();
  }
});
