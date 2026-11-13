import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-004',
  name: '아이디 앞뒤에 공백을 붙여 로그인하면 로비로 넘어가고 상단 바에 공백 없는 아이디가 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('아이디 앞뒤에 공백을 붙여 넣고 맞는 비밀번호로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.로그인(` ${params.loginId ?? ''} `, params.loginPassword ?? '');
  });

  await test.step('상단 바의 아이디를 확인한다', async () => {
    const 대기실 = await 로비.열기(game).catch(() => null);
    const 이름 = 대기실 === null ? '' : await 대기실.hud.캐릭터이름();
    await verify('아이디 앞뒤에 공백을 붙여 로그인하면 로비로 넘어가고 상단 바에 공백 없는 아이디가 보인다', 이름, (params.loginId ?? '').trim());
  });
});
