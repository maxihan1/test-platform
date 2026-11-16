import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 팔로워목록화면 } from './pages/follow-list.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-392',
  name: '프로필의 「Followers」 숫자를 누르면 팔로워 목록에 계정 줄과 팔로우 버튼이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다', '팔로워가 둘 이상인 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 팔로워가 둘 이상인 시드 계정').default('minjun_dev'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 목록 = new 팔로워목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await verify('프로필의 「Followers」 숫자가 보인다', await 뜰때까지(driver, 프로필.팔로워, 20_000), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필의 「Followers」 숫자를 누른다', async () => {
    await driver.$(프로필.팔로워).click();
    await verify('팔로워 목록에 계정 줄이 그려진다', await 목록.그려질때까지(), true, { blocker: true });
    const 계정줄 = await verify('팔로워 목록에 계정 줄이 보인다', (await 목록.개수(목록.계정들)) > 0, true);
    const 버튼 = await verify('팔로워 목록에 팔로우 버튼이 보인다', (await 목록.개수(목록.팔로우버튼들)) > 0, true);
    await verify('프로필의 「Followers」 숫자를 누르면 팔로워 목록에 계정 줄과 팔로우 버튼이 보인다', 계정줄 && 버튼, true);
  });
});
