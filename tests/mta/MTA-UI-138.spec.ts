import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-138',
  name: '인용 글 카드 안에 인용된 글이 작은 카드로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 인용된 글이 목록에 평평하게 그려져 작은 카드 주소가 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    작은카드주소: z.string().describe('인용 글 카드 안 작은 카드 요소 주소'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('jiho_cafe 의 인용 글 카드를 찾는다', async () => {
    await 프로필열기(driver, 'jiho_cafe');
    await verify('인용 글 카드 안에 인용된 글이 작은 카드로 보인다', await 뜰때까지(driver, params.작은카드주소, 25_000), true);
  });
});
