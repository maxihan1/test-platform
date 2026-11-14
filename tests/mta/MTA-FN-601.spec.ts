import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 속성이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-601',
  name: '내 새 글을 인용하는 글쓰기를 열면 인용 중에는 미디어 · 투표 버튼이 둘 다 비활성이다',
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
  const 부스트창 = new 부스트시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('인용 비활성');
  await test.step('내 새 글을 올린다', async () => {
    await 글올리기(driver, 본문);
  });
  try {
    await test.step('올린 글이 홈에 보이는지 확인한다', async () => {
      await verify('올린 글이 홈에 보인다', await 문구가보이나(driver, 본문), true, { blocker: true });
    });
    await test.step('내 새 글을 인용하는 글쓰기를 연다', async () => {
      await 카드.누르기(본문, 'boost_btn');
      await verify('부스트 시트가 뜬다', await 부스트창.떴나(), true, { blocker: true });
      await 부스트창.고르기('인용하기');
      await verify('인용 글쓰기가 열린다', await 글쓰기.떴나(), true, { blocker: true });
      const 미디어 = await verify('인용 중 「미디어 추가」 버튼이 비활성이다', await 속성이될때까지(driver, 글쓰기.미디어, 'enabled', 'false'), true);
      const 투표 = await verify('인용 중 「투표 추가」 버튼이 비활성이다', await 속성이될때까지(driver, 글쓰기.투표, 'enabled', 'false'), true);
      await verify('내 새 글을 인용하는 글쓰기를 열면 인용 중에는 미디어 · 투표 버튼이 둘 다 비활성이다', 미디어 && 투표, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 내글지우기(driver, 본문);
  }
});
