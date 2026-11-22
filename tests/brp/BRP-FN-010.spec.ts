import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나두기 } from './helpers/dungeon.helper.js';
import { 갈래B이름표글있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-010',
  name: '불러낸 임프 둘레의 화면 글자를 찾으면 던전에서 임프 머리 위에 이름이나 몬스터 이름표 글자가 보이지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 적을 모두 치우고 임프 하나를 불러 두었다'],
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
  await test.step('적을 모두 치우고 임프 하나를 불러 둔 것을 확인한다', async () => {
    await 임프하나두기(game);
    const 던전 = await 던전화면.열림(game);
    await verify('불러낸 임프가 보인다', await 던전.임프있나(), true, { blocker: true });
  });
  await test.step('불러낸 임프 둘레의 화면 글자를 찾는다', async () => {
    await verify('내 이름표 글자가 화면에 보인다', await 갈래B이름표글있나(game, 아이디), true, { blocker: true });
    const 이름 = await verify('임프 이름표 글자 「임프」가 보이지 않는다', await 갈래B이름표글있나(game, '임프'), false);
    const 몬스터 = await verify('몬스터 이름표 글자 「Imp」가 보이지 않는다', await 갈래B이름표글있나(game, 'Imp'), false);
    await verify('불러낸 임프 둘레의 화면 글자를 찾으면 던전에서 임프 머리 위에 이름이나 몬스터 이름표 글자가 보이지 않는다', 이름 && 몬스터, true);
  });
});
