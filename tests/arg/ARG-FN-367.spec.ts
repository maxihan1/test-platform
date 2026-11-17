import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 낱말모든값, 데이터조각, 첫값 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-367',
  name: '스킬 데이터를 읽으면 마법사 · 도적 · 공통 스킬의 값이 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['skill:magic_bolt', 'skill:healing_touch', 'skill:vital_strike', 'skill:dash_attack', 'skill:revive', 'skill:pick_up', 'skill:put_down'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 경계들 = ['탱커', '궁수', '마법사', '도적', '전투 망치', '방패 오라', '돌진', '화살 쏘기', '강화 사격', '일제 사격', '마력탄', '치유의 손길', '급소 찌르기', '질주 공격', '은신', '부활', '들기', '내려놓기'];
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

    await test.step('GM 명령으로 스킬 데이터를 읽는다', async () => {
      const 줄들 = await 데이터읽기(game, 'skill');
      const 값 = (이름: string, 낱말: string): number => 첫값(낱말모든값(데이터조각(줄들, 이름, 경계들), 낱말));
      const 값들 = [
        await verify.element('「마력탄」 피해가 스킬 표와 같다', 'skill:magic_bolt', 값('마력탄', 피해낱말), 5),
        await verify.element('「마력탄」 사거리가 스킬 표와 같다', 'skill:magic_bolt', 값('마력탄', 사거리낱말), 20),
        await verify.element('「마력탄」 재사용 대기가 스킬 표와 같다', 'skill:magic_bolt', 값('마력탄', 재사용낱말), 0.5),
        await verify.element('「치유의 손길」 회복이 스킬 표와 같다', 'skill:healing_touch', 값('치유의 손길', '(?:회복|값|heal|Heal)'), 250),
        await verify.element('「치유의 손길」 사거리가 스킬 표와 같다', 'skill:healing_touch', 값('치유의 손길', 사거리낱말), 10),
        await verify.element('「급소 찌르기」 피해가 스킬 표와 같다', 'skill:vital_strike', 값('급소 찌르기', 피해낱말), 15),
        await verify.element('「급소 찌르기」 사거리가 스킬 표와 같다', 'skill:vital_strike', 값('급소 찌르기', 사거리낱말), 2),
        await verify.element('「질주 공격」 피해가 스킬 표와 같다', 'skill:dash_attack', 값('질주 공격', 피해낱말), 30),
        await verify.element('「질주 공격」 사거리가 스킬 표와 같다', 'skill:dash_attack', 값('질주 공격', 사거리낱말), 20),
        await verify.element('「질주 공격」 재사용 대기가 스킬 표와 같다', 'skill:dash_attack', 값('질주 공격', 재사용낱말), 2),
        await verify.element('「부활」 체력이 스킬 표와 같다', 'skill:revive', 값('부활', '(?:체력|값|hp|HP)'), 400),
        await verify.element('「부활」 사거리가 스킬 표와 같다', 'skill:revive', 값('부활', 사거리낱말), 2),
        await verify.element('「들기」 사거리가 스킬 표와 같다', 'skill:pick_up', 값('들기', 사거리낱말), 2),
        await verify.element('「들기」 재사용 대기가 스킬 표와 같다', 'skill:pick_up', 값('들기', 재사용낱말), 1.5),
        await verify.element('「내려놓기」 사거리가 스킬 표와 같다', 'skill:put_down', 값('내려놓기', 사거리낱말), 2),
        await verify.element('「내려놓기」 재사용 대기가 스킬 표와 같다', 'skill:put_down', 값('내려놓기', 재사용낱말), 1.5),
      ];
      await verify('스킬 데이터를 읽으면 마법사 · 도적 · 공통 스킬의 값이 스킬 표와 같다', 값들.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
