import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 낱말모든값, 데이터조각, 첫값 } from './helpers/battle.helper.js';
import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-365',
  name: '스킬 데이터를 읽으면 탱커 · 궁수 스킬의 피해 · 사거리 · 재사용 대기가 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['skill:war_hammer', 'skill:shield_aura', 'skill:charge', 'skill:shoot_arrow', 'skill:power_shot', 'skill:volley'],
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
      const 조각 = (이름: string): string => 데이터조각(줄들, 이름, 경계들);
      const 값 = (이름: string, 낱말: string): number[] => 낱말모든값(조각(이름), 낱말)[0] ?? [];
      const 값들 = [
        await verify.element('「전투 망치」 피해가 스킬 표와 같다', 'skill:war_hammer', 첫값([값('전투 망치', 피해낱말)]), 10),
        await verify.element('「전투 망치」 사거리가 스킬 표와 같다', 'skill:war_hammer', 첫값([값('전투 망치', 사거리낱말)]), 2),
        await verify.element('「방패 오라」 설정값이 스킬 표와 같다', 'skill:shield_aura', 첫값([값('방패 오라', '(?:설정값|값|피해)')]), 30),
        await verify.element('「방패 오라」 효과 시간이 스킬 표와 같다', 'skill:shield_aura', 첫값([값('방패 오라', '(?:효과|지속|duration|Duration)')]), 5),
        await verify.element('「방패 오라」 반경이 스킬 표와 같다', 'skill:shield_aura', 첫값([값('방패 오라', '(?:반경|radius|Radius)')]), 6),
        await verify.element('「방패 오라」 재사용 대기가 스킬 표와 같다', 'skill:shield_aura', 첫값([값('방패 오라', 재사용낱말)]), 1.2),
        await verify.element('「돌진」 피해가 스킬 표와 같다', 'skill:charge', 첫값([값('돌진', 피해낱말)]), 15),
        await verify.element('「화살 쏘기」 피해가 스킬 표와 같다', 'skill:shoot_arrow', 첫값([값('화살 쏘기', 피해낱말)]), 5),
        await verify.element('「화살 쏘기」 사거리가 스킬 표와 같다', 'skill:shoot_arrow', 첫값([값('화살 쏘기', 사거리낱말)]), 20),
        await verify.element('「화살 쏘기」 재사용 대기가 스킬 표와 같다', 'skill:shoot_arrow', 첫값([값('화살 쏘기', 재사용낱말)]), 0.25),
        await verify.element('「강화 사격」 피해가 스킬 표와 같다', 'skill:power_shot', 값('강화 사격', 피해낱말), [5, 10, 15]),
        await verify.element('「강화 사격」 사거리가 스킬 표와 같다', 'skill:power_shot', 값('강화 사격', 사거리낱말), [20, 30, 50]),
        await verify.element('「강화 사격」 재사용 대기가 스킬 표와 같다', 'skill:power_shot', 첫값([값('강화 사격', 재사용낱말)]), 0.7),
        await verify.element('「일제 사격」 피해가 스킬 표와 같다', 'skill:volley', 첫값([값('일제 사격', 피해낱말)]), 7),
        await verify.element('「일제 사격」 반경이 스킬 표와 같다', 'skill:volley', 첫값([값('일제 사격', '(?:반경|radius|Radius)')]), 4),
        await verify.element('「일제 사격」 사거리가 스킬 표와 같다', 'skill:volley', 첫값([값('일제 사격', 사거리낱말)]), 20),
      ];
      await verify('스킬 데이터를 읽으면 탱커 · 궁수 스킬의 피해 · 사거리 · 재사용 대기가 스킬 표와 같다', 값들.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
