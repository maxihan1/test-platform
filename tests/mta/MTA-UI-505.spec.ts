import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-505',
  name: '내 프로필 「추천」 탭에 「Collections」 구간과 「모두 보기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 컬렉션 = new 컬렉션화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내 프로필 「추천」 탭을 연다', async () => {
    await driver.$(홈.탭.프로필).click();
    await verify('내 프로필 화면이 열린다', await 프로필.그려질때까지(), true, { blocker: true });
    await driver.$(프로필.탭('추천')).click();
    const 구간 = await verify('「Collections」 구간이 보인다', await 컬렉션.글자가뜰때까지('Collections'), true);
    const 모두보기 = await verify('「모두 보기」가 보인다', await 컬렉션.글자가뜰때까지('모두 보기'), true);
    await verify('내 프로필 「추천」 탭에 「Collections」 구간과 「모두 보기」가 보인다', 구간 && 모두보기, true);
  });
});
