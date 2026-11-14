import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-025',
  name: '「기록」에서 끝 쪽까지 「다음」을 누르면 「다음」이 비활성이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  let 끝쪽 = 1;

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    const 합계들: { 영역: string; 합계: number }[] = [];
    for (const 영역 of ['MAINTENANCE', 'NOTICE', 'SANCTION', 'GRANT']) {
      const r = await opsGet(page, `/logs/audit?area=${영역}&q=&page=1&size=50`);
      합계들.push({ 영역, 합계: Number(r.body.total ?? 0) });
    }
    const 여러쪽 = 합계들.filter((x) => x.합계 > 50).sort((a, b) => a.합계 - b.합계);
    const 고른 = 여러쪽[0] ?? [...합계들].sort((a, b) => b.합계 - a.합계)[0];
    await 화면.열기(`?f=${고른?.영역 ?? ''}`);
    const 쪽글 = (await 화면.쪽표시.innerText()).trim();
    끝쪽 = Number(쪽글.split('/')[1]?.trim() ?? '0');
    await verify('「기록」 쪽 표시의 끝 쪽 번호가 읽힌다', 끝쪽 >= 1, true, { blocker: true });
  });

  await test.step('「기록」에서 끝 쪽까지 「다음」을 누른다', async () => {
    for (let 쪽 = 1; 쪽 < 끝쪽; 쪽 += 1) await 화면.다음쪽으로();
    await verify('「기록」에서 끝 쪽까지 「다음」을 누르면 「다음」이 비활성이다', await 화면.다음.isDisabled(), true);
  });
});
