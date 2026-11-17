import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 낱말모든값, 몬스터줄, 첫값 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-362',
  name: '몬스터 데이터를 읽으면 임프 · 던지는 임프 · 보스 임프의 체력 · 피해 · 사거리 · 재사용 대기가 몬스터 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['monster:imp', 'monster:imp_thrower', 'monster:imp_boss'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 체력낱말 = '(?:체력|hp|HP|health)';
  const 피해낱말 = '(?:피해|값|dmg|damage|Damage)';
  const 사거리낱말 = '(?:사거리|range|Range)';
  const 재사용낱말 = '(?:재사용|cd|cooldown|Cooldown)';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전을 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('GM 명령으로 몬스터 데이터를 읽는다', async () => {
      const 줄들 = await 데이터읽기(game, 'monster');
      const 임프 = 몬스터줄(줄들, 'imp');
      const 던지는 = 몬스터줄(줄들, 'thrower');
      const 보스 = 몬스터줄(줄들, 'boss');
      const 값들 = [
        await verify.element('임프 체력이 몬스터 표와 같다', 'monster:imp', 첫값(낱말모든값(임프, 체력낱말)), 15),
        await verify.element('임프 피해가 몬스터 표와 같다', 'monster:imp', 첫값(낱말모든값(임프, 피해낱말)), 15),
        await verify.element('임프 사거리가 몬스터 표와 같다', 'monster:imp', 첫값(낱말모든값(임프, 사거리낱말)), 2),
        await verify.element('던지는 임프 체력이 몬스터 표와 같다', 'monster:imp_thrower', 첫값(낱말모든값(던지는, 체력낱말)), 100),
        await verify.element('던지는 임프 피해가 몬스터 표와 같다', 'monster:imp_thrower', 첫값(낱말모든값(던지는, 피해낱말)), 15),
        await verify.element('던지는 임프 사거리가 몬스터 표와 같다', 'monster:imp_thrower', 첫값(낱말모든값(던지는, 사거리낱말)), 8),
        await verify.element('던지는 임프 재사용 대기가 몬스터 표와 같다', 'monster:imp_thrower', Math.max(...낱말모든값(던지는, 재사용낱말).flat()), 4),
        await verify.element('보스 임프 체력이 몬스터 표와 같다', 'monster:imp_boss', 첫값(낱말모든값(보스, 체력낱말)), 500),
        await verify.element('보스 임프 근접 피해가 몬스터 표와 같다', 'monster:imp_boss', 첫값(낱말모든값(보스, 피해낱말), 0), 30),
        await verify.element('보스 임프 근접 사거리가 몬스터 표와 같다', 'monster:imp_boss', 첫값(낱말모든값(보스, 사거리낱말), 0), 4.5),
        await verify.element('보스 임프 짓밟기 돌진 피해가 몬스터 표와 같다', 'monster:imp_boss', 첫값(낱말모든값(보스, 피해낱말), 1), 30),
        await verify.element('보스 임프 짓밟기 돌진 사거리가 몬스터 표와 같다', 'monster:imp_boss', 첫값(낱말모든값(보스, 사거리낱말), 1), 15),
        await verify.element('보스 임프 짓밟기 돌진 재사용 대기가 몬스터 표와 같다', 'monster:imp_boss', Math.max(...낱말모든값(보스, 재사용낱말).flat()), 7.5),
      ];
      await verify('몬스터 데이터를 읽으면 임프 · 던지는 임프 · 보스 임프의 체력 · 피해 · 사거리 · 재사용 대기가 몬스터 표와 같다', 값들.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
