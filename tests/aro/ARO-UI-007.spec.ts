import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아래에있나 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-007',
  name: '「기록」 화면의 표 아래에 「이전」 · 「1 / N」 · 「다음」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「기록」 화면을 연다', async () => {
    await 화면.열기();
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
    const 이전 = await verify('「이전」 버튼이 보인다', await 화면.이전.isVisible(), true);
    const 쪽 = await verify('쪽 표시 「1 / N」이 보인다', /^1 \/ \d+$/.test((await 화면.쪽표시.innerText()).trim()), true);
    const 다음 = await verify('「다음」 버튼이 보인다', await 화면.다음.isVisible(), true);
    const 아래 = await verify('「이전」 · 쪽 표시 · 「다음」이 표 아래에 있다', await 아래에있나(화면.표, [화면.이전, 화면.쪽표시, 화면.다음]), true);
    await verify('「기록」 화면의 표 아래에 「이전」 · 「1 / N」 · 「다음」이 보인다', 이전 && 쪽 && 다음 && 아래, true);
  });
});
