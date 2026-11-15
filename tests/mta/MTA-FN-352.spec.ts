import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 서버 } from './helpers/app.helper.js';
import { URL열기줄 } from './helpers/nav.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-352',
  name: '계정 주소로 「마스토돈에서 URL 열기」를 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    계정: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 이 서버의 계정').default('hana_photo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필 주소로 「마스토돈에서 URL 열기」를 누른다', async () => {
    await 검색.적기('https://' + 서버 + '/@' + params.계정);
    await verify('「마스토돈에서 URL 열기」 줄이 보인다', await 뜰때까지(driver, URL열기줄, 15_000), true, { blocker: true });
    await driver.$(URL열기줄).click();
    const 열림 = await verify('프로필 화면이 열린다', await 프로필.그려질때까지(), true);
    const 계정 = await verify('프로필 계정이 입력한 계정이다', (await driver.$(프로필.계정).getText()).includes('@' + params.계정), true);
    await verify('계정 주소로 「마스토돈에서 URL 열기」를 누르면 그 사람 프로필이 열린다', 열림 && 계정, true);
  });
});
