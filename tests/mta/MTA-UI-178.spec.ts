import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자들, 뜰때까지, 보이나 } from './helpers/app.helper.js';
import { 글자요소가보이나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-178',
  name: '「투표 추가」를 누르면 항목(힌트 「옵션 1」 · 「옵션 2」) · 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 도구 줄에서 「투표 추가」를 누른다', async () => {
      await 글쓰기.투표누르기();
      await verify('투표 영역이 보인다', await 뜰때까지(driver, 글쓰기.투표영역), true, { blocker: true });
      const 힌트 = await verify('투표 항목 힌트가 「옵션 1」 · 「옵션 2」다', (await 글자들(driver, 글쓰기.투표항목들)).join(', '), '옵션 1, 옵션 2');
      const 추가 = await verify('「투표 옵션 추가」가 보인다', await 보이나(driver, 글쓰기.투표항목추가), true);
      const 길이 = await verify('「설문 길이」가 보인다', await 글자요소가보이나(driver, '설문 길이'), true);
      const 스타일 = await verify('「스타일」이 보인다', await 글자요소가보이나(driver, '스타일'), true);
      await verify('「투표 추가」를 누르면 항목(힌트 「옵션 1」 · 「옵션 2」) · 「투표 옵션 추가」 · 「설문 길이」 · 「스타일」이 보인다', 힌트 && 추가 && 길이 && 스타일, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
