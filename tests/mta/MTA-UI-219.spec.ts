import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 메뉴 } from './components/menu.component.js';
import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 뒤로가기로확인창띄우기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-219',
  name: '글 수정 중 닫거나 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다',
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
  const 글쓰기 = new 글쓰기화면(driver);
  const 카드 = new 글카드(driver);
  const 팝업 = new 메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('수정 닫기');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 새 글의 수정 화면을 연다', async () => {
      await 카드.누르기(본문, 'more');
      await 팝업.고르기('수정');
      await verify('글 수정 화면이 열린다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('내 새 글 수정 화면에서 본문을 고치고 뒤로 가기를 누른다', async () => {
      await 글쓰기.본문덧붙이기(' 고침');
      await verify('뒤로 가기를 누른 뒤 확인 창이 뜬다', await 뒤로가기로확인창띄우기(driver), true, { blocker: true });
      await verify('글 수정 중 닫거나 뒤로 가면 「변경 사항을 지우시겠습니까?」 창이 뜬다', await 문구가보이나(driver, '변경 사항을 지우시겠습니까?'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
