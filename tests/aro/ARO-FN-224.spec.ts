import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정 } from './helpers/sanction.helper.js';
import { 글자 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-224',
  name: '정지 창 사유 칸에 200자를 적으면 200자가 다 들어간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    한도글자수: z.number().int().min(1).max(200).describe('사유 칸에 적을 글자 수 — 1~200').default(200),
    초과글자수: z.number().int().min(201).describe('한도를 넘겨 적을 글자 수 — 201 이상').default(201),
  }),
  expected: z.object({
    최대글자수: z.number().describe('사유 칸에 들어가는 최대 글자 수').default(200),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인하고 대상 계정의 제재를 풀어 둔다', async () => {
    await 대상준비(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」에서 대상 계정 줄을 확인한다', async () => {
    await 화면.열기(`?q=${시험계정}`);
    await verify('대상 계정 줄에 「정지」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지').isVisible(), true, { blocker: true });
  });

  await test.step('유저 표에서 qa_player2 의 「정지」를 눌러 정지 창을 연다', async () => {
    await 화면.제재창열기(시험계정, '정지');
  });

  await test.step('정지 창의 사유 칸을 확인한다', async () => {
    await verify('정지 창에 사유 칸이 보인다', await 화면.제재사유칸.isVisible(), true, { blocker: true });
  });

  await test.step('정지 창 사유 칸에 200자를 적는다', async () => {
    await 화면.제재사유칸.fill(글자(params.한도글자수));
    await verify('정지 창 사유 칸에 200자를 적으면 200자가 다 들어간다', (await 화면.제재사유칸.inputValue()).length, params.한도글자수);
  });

  await test.step('정지 창 사유 칸에 201자를 적는다', async () => {
    await 화면.제재사유칸.fill(글자(params.초과글자수));
    await verify('201자를 적어도 사유 칸에는 200자까지만 들어간다', (await 화면.제재사유칸.inputValue()).length, expected.최대글자수);
  });
});
