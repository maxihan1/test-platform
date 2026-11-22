import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 데이터표줄찾기, 표읽기 } from './helpers/dungeon.helper.js';
import { GM레벨 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-455',
  name: '/gm level 1 과 /gm level 30 에서 /gm data monster 를 읽어 견주면 플레이어 레벨이 1 에서 30 으로 올라도 /gm data monster 의 임프 체력 · 피해가 그대로다',
  platforms: ['windows'],
  precondition: ['몬스터 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['level:1', 'level:30', 'monster:임프'],
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

  await test.step('/gm level 1 과 /gm level 30 에서 /gm data monster 를 읽어 견준다', async () => {
    await GM레벨(game, 1);
    const 낮은 = 데이터표줄찾기(await 표읽기(game, 'monster'), '임프');
    await GM레벨(game, 30);
    const 높은 = 데이터표줄찾기(await 표읽기(game, 'monster'), '임프');
    const 체력 = await verify('임프 체력이 그대로다', 높은.체력, 낮은.체력);
    const 피해 = await verify('임프 피해가 그대로다', 높은.스킬[0]?.값, 낮은.스킬[0]?.값);
    await verify('/gm level 1 과 /gm level 30 에서 /gm data monster 를 읽어 견주면 플레이어 레벨이 1 에서 30 으로 올라도 /gm data monster 의 임프 체력 · 피해가 그대로다', 체력 && 피해, true);
  });
});
