import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 좋아요수가될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-178',
  name: '「좋아요」를 누르면 좋아요가 켜지고 다시 누르면 꺼진다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('좋아요 두 번');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 새 글의 「좋아요」를 두 번 누른다', async () => {
      await 카드.누르기(본문, 'favorite_btn');
      const 켜짐 = await verify('「좋아요」를 한 번 누른 뒤 좋아요가 켜진다', await 좋아요수가될때까지(driver, 본문, ['1']), true);
      await 카드.누르기(본문, 'favorite_btn');
      const 꺼짐 = await verify('「좋아요」를 다시 누른 뒤 좋아요가 꺼진다', await 좋아요수가될때까지(driver, 본문, ['', '0']), true);
      await verify('「좋아요」를 누르면 좋아요가 켜지고 다시 누르면 꺼진다', 켜짐 && 꺼짐, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
