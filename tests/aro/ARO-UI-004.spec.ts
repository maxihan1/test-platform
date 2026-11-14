import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-004',
  name: '여섯 메뉴 화면에 본문 맨 위 큰 제목이 메뉴 이름과 같게 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 제목들: string[] = [];

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('왼쪽 메뉴 여섯 개를 차례로 연다', async () => {
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    for (const 이름 of ['유저 · 제재', '지급 · 회수', '공지', '점검', '기록', '대시보드'] as const) {
      await 대시보드.메뉴열고그려질때까지(이름);
      제목들.push((await 대시보드.틀.본문제목.innerText()).trim());
    }
    await verify('여섯 메뉴 화면에 본문 맨 위 큰 제목이 메뉴 이름과 같게 보인다', 제목들.join(', '), '유저 · 제재, 지급 · 회수, 공지, 점검, 기록, 대시보드');
  });
});
