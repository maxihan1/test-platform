import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-299',
  name: '로비에서 던전으로 넘어갈 때 「불러오는 중…」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['class:tank', 'zone:Lobby', 'move:장소 로비→던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    로딩글: z.string().describe('던전으로 넘어갈 때 로딩 화면 글자').default('불러오는 중…'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  await test.step('탱커를 선택하고 「준비!」를 누른다', async () => {
    const 대기실 = await 로비.열기(game);
    await 대기실.직업고르기('탱커');
    await 대기실.준비누르기();
    await verify('로비에서 던전으로 넘어갈 때 「불러오는 중…」이 보인다', await 대기실.로딩글이뜨는지(expected.로딩글), true);
    await 던전.열기(game);
  });
});
