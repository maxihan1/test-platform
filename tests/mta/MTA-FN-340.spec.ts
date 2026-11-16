import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-340',
  name: '둘러보기 탭 목록을 내린 뒤 같은 탭을 다시 누르면 맨 위 안내가 다시 보인다',
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

  await test.step('둘러보기 「게시물」 탭을 내린 뒤 같은 탭을 다시 누른다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    await 둘러보기.탭누르기('게시물');
    await verify('안내가 보인다', await 뜰때까지(driver, 둘러보기.안내글, 15_000), true, { blocker: true });
    await 둘러보기.아래로밀기();
    await verify('안내가 화면 밖으로 나간다', await 사라질때까지(driver, 둘러보기.안내글, 10_000), true, { blocker: true });
    await 둘러보기.탭누르기('게시물');
    await verify('둘러보기 탭 목록을 내린 뒤 같은 탭을 다시 누르면 맨 위 안내가 다시 보인다', await 뜰때까지(driver, 둘러보기.안내글, 10_000), true);
  });
});
