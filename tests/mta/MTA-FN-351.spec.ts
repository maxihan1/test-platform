import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-351',
  name: '검색 결과가 없으면 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('검색에 적을 없는 낱말 — 어느 글에도 없을 낱말').default('zzqq없는낱말qq'),
  }),
  expected: z.object({
    안내: z.string().describe('결과 없음 안내 글').default('검색어에 대한 결과를 찾을 수 없습니다'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('검색에 없는 낱말을 적고 완료 키를 친다', async () => {
    await 검색.적기(params.검색어);
    await 검색.완료키();
    await 될때까지(driver, async () => (await driver.$(검색.빈결과글).getText()) !== '', 15_000);
    await verify('검색 결과가 없으면 「검색어에 대한 결과를 찾을 수 없습니다」가 보인다', await driver.$(검색.빈결과글).getText(), expected.안내);
  });
});
