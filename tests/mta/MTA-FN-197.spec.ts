import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 스낵바 } from './components/snackbar.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나, 사라질때까지 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-197',
  name: '글을 고정하면 스낵바 「게시물이 고정되었습니다.」, 해제하면 「게시물 고정이 해제되었습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 팝업 = new 메뉴(driver);
  const 알림줄 = new 스낵바(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('고정과 해제');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 새 글을 프로필에 고정했다가 고정 해제한다', async () => {
      await 카드.누르기(본문, 'more');
      await 팝업.고르기('프로필에 고정');
      const 고정 = await verify('고정한 뒤 스낵바 「게시물이 고정되었습니다.」가 보인다', await 알림줄.글(), '게시물이 고정되었습니다.');
      await 사라질때까지(driver, 알림줄.글자);
      await 카드.누르기(본문, 'more');
      await 팝업.고르기('프로필에서 고정 해제');
      const 해제 = await verify('고정을 해제한 뒤 스낵바 「게시물 고정이 해제되었습니다.」가 보인다', await 알림줄.글(), '게시물 고정이 해제되었습니다.');
      await verify('글을 고정하면 스낵바 「게시물이 고정되었습니다.」, 해제하면 「게시물 고정이 해제되었습니다.」가 보인다', 고정 && 해제, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
