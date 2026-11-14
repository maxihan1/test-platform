import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 뜰때까지 } from './helpers/app.helper.js';
import { 글자요소가보이나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-192',
  name: '투표 기간은 5분 · 30분 · 1시간 · 6시간 · 12시간 · 1일(기본) · 3일 · 1 주 가운데 고른다',
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
    await test.step('투표 영역을 연다', async () => {
      await 글쓰기.투표누르기();
      await verify('투표 영역이 보인다', await 뜰때까지(driver, 글쓰기.투표영역), true, { blocker: true });
    });
    await test.step('투표 영역에서 「설문 길이」를 누른다', async () => {
      await 글쓰기.설문길이누르기();
      const 길이1 = await verify('설문 길이 선택지에 「5분」이 보인다', await 글자요소가보이나(driver, '5분'), true);
      const 길이2 = await verify('설문 길이 선택지에 「30분」이 보인다', await 글자요소가보이나(driver, '30분'), true);
      const 길이3 = await verify('설문 길이 선택지에 「1시간」이 보인다', await 글자요소가보이나(driver, '1시간'), true);
      const 길이4 = await verify('설문 길이 선택지에 「6시간」이 보인다', await 글자요소가보이나(driver, '6시간'), true);
      const 길이5 = await verify('설문 길이 선택지에 「12시간」이 보인다', await 글자요소가보이나(driver, '12시간'), true);
      const 길이6 = await verify('설문 길이 선택지에 「1일」이 보인다', await 글자요소가보이나(driver, '1일'), true);
      const 길이7 = await verify('설문 길이 선택지에 「3일」이 보인다', await 글자요소가보이나(driver, '3일'), true);
      const 길이8 = await verify('설문 길이 선택지에 「1 주」이 보인다', await 글자요소가보이나(driver, '1 주'), true);
      await verify('투표 기간은 5분 · 30분 · 1시간 · 6시간 · 12시간 · 1일(기본) · 3일 · 1 주 가운데 고른다', 길이1 && 길이2 && 길이3 && 길이4 && 길이5 && 길이6 && 길이7 && 길이8, true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
