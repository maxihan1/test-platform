import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { IP규칙목록화면 } from './pages/ip-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-201',
  name: 'IP 규칙 화면에 placeholder 「192.0.2.0/24」 검색칸 · 「검색」 · 「초기화」 · 「삭제」 · 「규칙 만들기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new IP규칙목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「IP 규칙들」 화면을 연다', async () => {
    await 목록.열기();
    const 칸 = await verify('placeholder 「192.0.2.0/24」 검색칸이 보인다', await 목록.검색칸.isVisible(), true);
    const 검색 = await verify('「검색」이 보인다', await 목록.검색.isVisible(), true);
    const 초기화 = await verify('「초기화」가 보인다', await 목록.초기화.isVisible(), true);
    const 삭제 = await verify('「삭제」가 보인다', await 목록.삭제.isVisible(), true);
    const 만들기 = await verify('「규칙 만들기」가 보인다', await 목록.규칙만들기.isVisible(), true);
    await verify('IP 규칙 화면에 placeholder 「192.0.2.0/24」 검색칸 · 「검색」 · 「초기화」 · 「삭제」 · 「규칙 만들기」가 보인다', 칸 && 검색 && 초기화 && 삭제 && 만들기, true);
  });
});
