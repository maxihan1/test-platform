import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지, 열린창닫기 } from './helpers/login.helper.js';
import { 로비 } from './pages/lobby.page.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-296',
  name: '메뉴 「길드」를 누르면 길드 창이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('메뉴 「길드」를 누른다', async () => {
    const 대기실 = await 로비.열기(game);
    try {
      await 대기실.hud.메뉴누르기('길드');
      await verify('메뉴 「길드」를 누르면 길드 창이 열린다', await 뜨는지(game, 길드창.제목, 15_000), true);
    } finally {
      await 열린창닫기(game);
    }
  });
});
