import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-658',
  name: '운영자 작업 검색 칸에 「qa_ops」를 적으면 운영자 · 대상 · 내용에 「qa_ops」가 든 줄만 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('운영자 작업 검색 칸에 적을 낱말 — 운영자 · 대상 · 내용에 들어 있는 낱말').default('qa_ops'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('운영자 작업 검색 칸에 「qa_ops」를 적는다', async () => {
    await 화면.검색(params.검색어);
    const 줄들 = await 화면.줄들.all();
    const 걸린것: string[] = [];
    for (const 줄 of 줄들) {
      const 칸 = await 화면.칸글(줄);
      if (![칸[1], 칸[4], 칸[5]].some((글) => (글 ?? '').includes(params.검색어))) 걸린것.push(칸.join(' | '));
    }
    const 보인다 = await verify('「qa_ops」가 든 줄이 보인다', 줄들.length > 0, true);
    const 모두맞다 = await verify('보이는 줄의 운영자 · 대상 · 내용에 「qa_ops」가 들어 있다', 걸린것.join(' / '), '');
    await verify('운영자 작업 검색 칸에 「qa_ops」를 적으면 운영자 · 대상 · 내용에 「qa_ops」가 든 줄만 보인다', 보인다 && 모두맞다, true);
  });
});
