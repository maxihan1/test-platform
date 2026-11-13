import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-193',
  name: '숫자가 아닌 검색어 「maxihan」을 적으면 이메일에 「maxihan」이 든 계정만 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    이메일조각: z.string().min(1).describe('검색어 — 숫자가 아니고 어떤 계정의 이메일에 들어 있는 글').default('maxihan'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「유저 · 제재」 화면을 열어 유저 표를 확인한다', async () => {
    await 화면.열기();
    await verify('유저 표가 보인다', await 화면.유저표.isVisible(), true, { blocker: true });
  });

  await test.step('유저 검색 칸에 「maxihan」을 적는다', async () => {
    await 화면.검색(params.이메일조각);
    const 이메일들 = (await 화면.이메일칸들.allInnerTexts()).map((x) => x.trim());
    const 안맞는이메일 = 이메일들.filter((e) => !e.toLowerCase().includes(params.이메일조각.toLowerCase())).join(', ');
    const 모두맞음 = await verify('보이는 이메일 가운데 「maxihan」이 없는 것이 없다', 안맞는이메일, '');
    const 보임 = await verify('이메일에 「maxihan」이 든 계정이 보인다', 이메일들.length > 0, true);
    await verify('숫자가 아닌 검색어 「maxihan」을 적으면 이메일에 「maxihan」이 든 계정만 보인다', 모두맞음 && 보임, true);
  });
});
