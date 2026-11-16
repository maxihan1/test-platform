import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-380',
  name: '프로필의 해시태그 칩을 누르면 그 해시태그 글만 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다', '프로필에 해시태그 칩이 있는 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 해시태그 칩이 있는 시드 계정').default('minjun_dev'),
    칩: z.string().min(1).describe('누를 해시태그 칩 — 샵 기호가 붙은 낱말').default('#오픈소스'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await verify('프로필에 「#오픈소스」 칩이 보인다', await 뜰때까지(driver, 프로필.해시태그칩(params.칩), 20_000), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필의 「#오픈소스」 칩을 누른다', async () => {
    await driver.$(프로필.해시태그칩(params.칩)).click();
    const 그태그만 = await 될때까지(
      driver,
      async () => {
        const 글들 = await 프로필.글들(프로필.목록글본문들);
        return 글들.length > 0 && 글들.every((글) => 글.includes(params.칩));
      },
      15_000,
    );
    await verify('프로필의 해시태그 칩을 누르면 그 해시태그 글만 보인다', 그태그만, true);
  });
});
