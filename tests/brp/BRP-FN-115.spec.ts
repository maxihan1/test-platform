import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스방가기, GM스위치가기 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-115',
  name: '/gm tp boss 로 스위치에서 떠나면 스위치에서 떠나 문이 닫힐 때 던전 알림 줄에 「문이 닫힙니다」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 던전 바닥 스위치 위에 있어 문이 열려 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('일반 회원이 던전 바닥 스위치 위에 있어 문이 열려 있는 것을 확인한다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM스위치가기(game);
    await verify('문이 열렸다는 알림이 알림 줄에 보인다', await 던전.알림줄기다리기('문이 열렸습니다!'), true, { blocker: true });
  });
  await test.step('/gm tp boss 로 스위치에서 떠난다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM보스방가기(game);
    await verify('/gm tp boss 로 스위치에서 떠나면 스위치에서 떠나 문이 닫힐 때 던전 알림 줄에 「문이 닫힙니다」가 보인다', await 던전.알림줄기다리기('문이 닫힙니다'), true);
  });
});
