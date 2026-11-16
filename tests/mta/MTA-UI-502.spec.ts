import { defineCase, test, verify } from '@platform/kit';
import { 보이나, 먼저뜨는것 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-502',
  name: '둘러보기 「게시물」 · 「해시태그」 탭에 유행 항목이나 빈 화면 문구가 보인다',
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
  const 둘러보기 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('둘러보기 「게시물」 · 「해시태그」 탭을 연다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    await 둘러보기.탭누르기('게시물');
    await 먼저뜨는것(driver, { 글: 둘러보기.첫글카드, 빈화면: 둘러보기.빈화면글 }, 15_000);
    const 게시물글 = await 보이나(driver, 둘러보기.첫글카드);
    const 게시물빈화면 = await 보이나(driver, 둘러보기.빈화면글);
    const 게시물 = await verify('「게시물」 탭에 유행 글이나 빈 화면 문구가 보인다', 게시물글 || 게시물빈화면, true);
    await 둘러보기.탭누르기('해시태그');
    await 먼저뜨는것(driver, { 태그: 둘러보기.해시태그글, 빈화면: 둘러보기.빈화면글 }, 15_000);
    const 태그 = await 보이나(driver, 둘러보기.해시태그글);
    const 태그빈화면 = await 보이나(driver, 둘러보기.빈화면글);
    const 해시태그 = await verify('「해시태그」 탭에 유행 해시태그나 빈 화면 문구가 보인다', 태그 || 태그빈화면, true);
    await verify('둘러보기 「게시물」 · 「해시태그」 탭에 유행 항목이나 빈 화면 문구가 보인다', 게시물 && 해시태그, true);
  });
});
