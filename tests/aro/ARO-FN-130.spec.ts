import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 쿠키읽기, 쿠키심기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-130',
  name: '로그아웃 전 쿠키 값을 다시 심으면 로그인 없이 대시보드가 열린다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('운영자 계정으로 로그인하고 대시보드를 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true, { blocker: true });
  });

  await test.step('로그아웃 전 쿠키 값을 적어 두고 로그아웃한 뒤 그 값을 다시 심어 대시보드를 연다', async () => {
    const 앞쿠키 = await 쿠키읽기(page, 'anyrpg_ops');
    await 대시보드.틀.로그아웃누르기();
    await 대시보드.창.열릴때까지();
    await 대시보드.창.누르기('확인');
    await 로그인.제목.waitFor();
    await 쿠키심기(page, 앞쿠키);
    const 열림 = await 대시보드.열렸나();
    await verify('로그아웃 전 쿠키 값을 다시 심으면 로그인 없이 대시보드가 열린다', 열림 && new URL(page.url()).pathname === 대시보드화면.주소, true);
  });
});
