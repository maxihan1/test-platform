import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-397',
  name: '접속한 모두가 준비하면 던전으로 넘어간다',
  platforms: ['android'],
  precondition: ['다른 접속자가 없고 로비에 있다'],
  elements: ['class:tank', 'zone:Lobby', 'zone:Dungeon', 'move:장소 로비→던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  smoke: true,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    const 대기실 = await 로비.열기(game);
    await verify('접속 인원이 「1명 접속 중」이다', await 대기실.접속인원글(), '1명 접속 중', { blocker: true });
  });

  await test.step('탱커를 선택하고 「준비!」를 누른다', async () => {
    const 대기실 = await 로비.열기(game);
    await 대기실.직업고르기('탱커');
    await 대기실.준비누르기();
    await verify('접속한 모두가 준비하면 던전으로 넘어간다', await 뜨는지(game, 던전.행동막대, 60_000), true);
  });
});
