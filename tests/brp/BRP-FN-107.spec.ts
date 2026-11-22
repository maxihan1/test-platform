import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스처치, GM보스방가기 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-107',
  name: '보스 임프가 죽으면 7초 안팎(10초 안)에 결과 화면으로 간다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    상한초: z.number().describe('보스가 죽은 뒤 결과 화면까지 허용하는 시간(초) — 기획서 10초 안').default(10),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
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
  await test.step('/gm tp boss 로 보스 방에 가서 /gm killboss 로 보스를 잡는다', async () => {
    await GM보스방가기(game);
    await GM보스처치(game);
    const 시작 = Date.now();
    const 떴다 = await verify('결과 화면이 열린다', await 결과화면.뜰때까지(game, 40_000), true, { blocker: true });
    const 안 = await verify('걸린 시간이 기대값 안이다', (Date.now() - 시작) / 1000 <= expected.상한초, true);
    await verify('보스 임프가 죽으면 7초 안팎(10초 안)에 결과 화면으로 간다', 떴다 && 안, true);
    const 결과 = await 결과화면.열림(game);
    await verify('보스를 잡고 간 결과 화면에 「승리!」가 보인다', await 결과.승리글읽기(), '승리!');
  });
});
