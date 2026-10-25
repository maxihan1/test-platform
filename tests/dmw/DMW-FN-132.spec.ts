import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 토스트 } from './components/toast.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-132',
  name: '삭제 모달에서 「삭제」를 누르면 게시판 목록으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 안내 = new 모달(page);
  const 알림 = new 토스트(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 열고 삭제 모달을 띄운다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await 상세.삭제.click();
      await 안내.뜰때까지();
      await verify('삭제 확인 모달이 보인다', await 안내.창.isVisible(), true, { blocker: true });
    });

    await test.step('삭제 모달에서 「삭제」를 누른다', async () => {
      await 안내.버튼('삭제').click();
      await 목록.그려질때까지();
      await verify('삭제 모달에서 「삭제」를 누르면 게시판 목록으로 간다', await 목록.큰제목.isVisible(), true);
    });

    await test.step('글을 지운 뒤 토스트를 확인한다', async () => {
      await verify('게시글을 지우면 목록에서 토스트 「삭제되었습니다」가 보인다', await 알림.글('삭제되었습니다').isVisible(), true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
