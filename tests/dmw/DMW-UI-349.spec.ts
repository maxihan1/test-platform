import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import type { 글정보 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-349',
  name: '게시글 상세 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 안내 = new 모달(page);
  let 글: 글정보 | undefined;

  try {
    await test.step('일회용 회원이 올린 내 글의 상세 화면을 연다', async () => {
      글 = await 일회용회원의글만들기(page.request);
      await 안내창막기(page);
      await 상세.열기(글.번호);
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글의 제목이 보인다', await 상세.제목.innerText(), 글.제목, { blocker: true });
    });

    await test.step('내 글 상세의 「수정」을 누른다', async () => {
      await 상세.수정.click();
      await 쓰기.수정큰제목.waitFor();
      await verify('게시글 상세에서 「수정」을 누르면 게시글 수정 화면이 보인다', await 쓰기.수정큰제목.isVisible(), true);
    });

    await test.step('삭제 확인 모달의 「취소」를 누른다', async () => {
      await 상세.열기(글?.번호 ?? 0);
      await 상세.삭제.click();
      await 안내.뜰때까지();
      await 안내.버튼('취소').click();
      await 안내.사라질때까지();
      await verify('게시글 상세에서 삭제 확인 모달 「취소」를 누르면 모달이 닫힌다', await 안내.창.count(), 0);
    });

    await test.step('로그인 필요 모달의 「×」를 누른다', async () => {
      await page.context().clearCookies();
      await 상세.열기(글?.번호 ?? 0);
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await 상세.좋아요.click();
      await 안내.뜰때까지();
      await 안내.닫기X.click();
      await 안내.사라질때까지();
      await verify('게시글 상세에서 로그인 필요 모달 「×」를 누르면 모달이 닫힌다', await 안내.창.count(), 0);
    });
  } finally {
    if (글 !== undefined) {
      await API로그인(page.request, 글.회원.loginId, 글.회원.password);
      await 글지우기(page.request, 글.번호);
    }
  }
});
