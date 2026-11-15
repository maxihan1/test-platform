import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 목록만들기화면열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-424',
  name: '목록 이름을 비운 채 「만들기」를 누르면 「비워둘 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    오류글: z.string().describe('이름이 비었을 때 안내').default('비워둘 수 없습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('홈 드롭다운에서 「목록 만들기」를 연다', async () => {
    await verify('목록 만들기 1단계 화면이 열린다', await 목록만들기화면열기(driver), true, { blocker: true });
  });
  await test.step('목록 이름을 비운 채 「만들기」를 누른다', async () => {
    await driver.$(목록.만들기).click();
    await verify('목록 이름을 비운 채 「만들기」를 누르면 「비워둘 수 없습니다」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.오류글), 10_000), true);
  });
});
