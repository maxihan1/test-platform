import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 화면글포함 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-171',
  name: '답장 글쓰기에 「님에게 답장」과 원문 요약이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('답장할 minjun_dev 글의 일부 — 그 글을 찾는 낱말').default('마스토돈 4.7 인용 기능'),
  }),
  expected: z.object({
    답장글: z.string().describe('답장 글쓰기에 든 안내 글').default('님에게 답장'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 글 상세에서 「답장」을 누른다', async () => {
    await 글상세열기(driver, 'minjun_dev', params.글일부);
    await verify('글 상세 화면이 보인다', await 글상세.그려질때까지(), true, { blocker: true });
    await driver.$(글상세.답장).click();
    await verify('답장 글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    const 안내 = await verify('답장 안내가 보인다', await 뜰때까지(driver, 화면글포함(expected.답장글), 10_000), true);
    const 요약 = await verify('원문 요약이 보인다', await 뜰때까지(driver, 화면글포함(params.글일부), 10_000), true);
    await verify('답장 글쓰기에 「님에게 답장」과 원문 요약이 보인다', 안내 && 요약, true);
  });
});
