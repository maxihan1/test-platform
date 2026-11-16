import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-192',
  name: '「설문 길이」를 누르면 「5분」 · 「30분」 · 「1시간」 · 「6시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('투표의 「설문 길이」를 누른다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await driver.$(글쓰기.설문길이).click();
    const 항목0 = await verify('「5분」이 보인다', await 글쓰기.메뉴.뜰때까지('5분'), true);
    const 항목1 = await verify('「30분」이 보인다', await 글쓰기.메뉴.뜰때까지('30분'), true);
    const 항목2 = await verify('「1시간」이 보인다', await 글쓰기.메뉴.뜰때까지('1시간'), true);
    const 항목3 = await verify('「6시간」이 보인다', await 글쓰기.메뉴.뜰때까지('6시간'), true);
    const 항목4 = await verify('「12시간」이 보인다', await 글쓰기.메뉴.뜰때까지('12시간'), true);
    const 항목5 = await verify('「1일」이 보인다', await 글쓰기.메뉴.뜰때까지('1일'), true);
    const 항목6 = await verify('「3일」이 보인다', await 글쓰기.메뉴.뜰때까지('3일'), true);
    const 항목7 = await verify('「1 주」이 보인다', await 글쓰기.메뉴.뜰때까지('1 주'), true);
    await verify('「설문 길이」를 누르면 「5분」 · 「30분」 · 「1시간」 · 「6시간」 · 「12시간」 · 「1일」 · 「3일」 · 「1 주」가 보인다', 항목0 && 항목1 && 항목2 && 항목3 && 항목4 && 항목5 && 항목6 && 항목7, true);
  });
});
