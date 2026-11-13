import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전까지, 로비까지, 메인메뉴로 } from './helpers/login.helper.js';
import { 뜨는지, 있는지 } from './helpers/find.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'ARG-FN-373',
  name: '로비와 던전에서는 상단 바가 보이고 메인 메뉴로 나가면 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['zone:Lobby', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 접속 인원이 「1명 접속 중」이다', await 대기실.접속인원글(), '1명 접속 중', { blocker: true });
  });

  await test.step('로비 · 던전 · 메인 메뉴에서 상단 바를 확인한다', async () => {
    const 로비보임 = await 뜨는지(game, 공통HUD.상단바);
    await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 던전보임 = await 뜨는지(game, 공통HUD.상단바);
    await 메인메뉴로(game);
    const 메뉴보임 = await 있는지(game, 공통HUD.상단바);
    await verify('로비와 던전에서는 상단 바가 보이고 메인 메뉴로 나가면 보이지 않는다', 로비보임 && 던전보임 && !메뉴보임, true);
  });
});
