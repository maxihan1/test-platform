import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-067',
  name: '골드를 바꾼 직후 접속을 끊으면 운영 API 의 캐릭터 골드가 1357 이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('GM 명령으로 골드를 1357 로 바꾸고 바로 게임을 끈다', async () => {
    await GM골드(game, 1357);
    await game.restart();
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => c.gold === 1357, 25_000);
    await verify('골드를 바꾼 직후 접속을 끊으면 운영 API 의 캐릭터 골드가 1357 이다', 값.gold, 1357);
  });
});
