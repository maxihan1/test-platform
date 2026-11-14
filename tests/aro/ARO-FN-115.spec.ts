import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 쿠키읽기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-115',
  name: '로그인하면 anyrpg_ops 쿠키가 httpOnly · SameSite=Strict · Secure 로 심기고 12시간 뒤 만료된다',
  precondition: ['로그인하지 않았다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
  });

  await test.step('로그인한 뒤 브라우저 쿠키를 읽는다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await 대시보드.제목.waitFor();
    const 쿠키 = await 쿠키읽기(page, 'anyrpg_ops');
    const 지금 = Date.now() / 1000;
    const 자바스크립트막음 = await verify('anyrpg_ops 쿠키가 httpOnly 로 심긴다', 쿠키?.httpOnly, true);
    const 같은사이트 = await verify('anyrpg_ops 쿠키가 SameSite=Strict 로 심긴다', 쿠키?.sameSite, 'Strict');
    const 보안연결 = await verify('anyrpg_ops 쿠키가 Secure 로 심긴다', 쿠키?.secure, true);
    const 만료 = await verify('anyrpg_ops 쿠키가 12시간 뒤 만료된다', 쿠키 === undefined ? null : Math.round((쿠키.expires - 지금) / 3600), 12);
    await verify('로그인하면 anyrpg_ops 쿠키가 httpOnly · SameSite=Strict · Secure 로 심기고 12시간 뒤 만료된다', 자바스크립트막음 && 같은사이트 && 보안연결 && 만료, true);
  });

  await test.step('화면 스크립트에서 document.cookie 를 읽는다', async () => {
    const 글 = await 대시보드.문서쿠키();
    await verify('화면 스크립트의 document.cookie 에 anyrpg_ops 가 없다', 글.includes('anyrpg_ops'), false);
  });
});
