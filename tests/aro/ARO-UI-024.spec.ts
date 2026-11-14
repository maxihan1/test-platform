import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-024',
  name: '왼쪽 메뉴에 여섯 메뉴가 보이고 「유저 · 제재」에 현재 메뉴 표시가 붙어 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 유저 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('「유저 · 제재」 화면을 연다', async () => {
    await 유저.열기();
    await 유저.틀.그려질때까지();
    const 메뉴들 = await verify(
      '왼쪽 메뉴에 여섯 메뉴가 보인다',
      (await 유저.틀.메뉴링크들.allInnerTexts()).map((글) => 글.trim()).join(', '),
      '대시보드, 유저 · 제재, 지급 · 회수, 공지, 점검, 기록',
    );
    const 현재 = await verify('「유저 · 제재」에 현재 메뉴 표시가 붙어 보인다', (await 유저.틀.현재메뉴.innerText()).trim(), '유저 · 제재');
    await verify('왼쪽 메뉴에 여섯 메뉴가 보이고 「유저 · 제재」에 현재 메뉴 표시가 붙어 보인다', 메뉴들 && 현재, true);
  });
});
