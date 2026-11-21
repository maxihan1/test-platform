import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스킬조각, 첫수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM자료, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-462',
  name: '「/gm data skill」을 보내면 탱커 · 궁수 · 마법사 스킬의 기본 수치 · 사거리 · 재사용 대기가 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['skill:전투 망치', 'skill:방패 오라', 'skill:화살 쏘기', 'skill:강화 사격', 'skill:일제 사격', 'skill:마력탄', 'skill:치유의 손길'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「/gm data skill」을 보내 탱커 · 궁수 · 마법사 스킬 줄을 읽는다', async () => {
    const 줄들 = await GM자료(game, 'skill');
    const 확인1 = await verify.element('전투 망치 피해가 10 이다', 'skill:전투 망치', 첫수치(스킬조각(줄들, '전투 망치'), ['값']), 10);
    const 확인2 = await verify.element('전투 망치 사거리가 2 다', 'skill:전투 망치', 첫수치(스킬조각(줄들, '전투 망치'), ['사거리']), 2);
    const 확인3 = await verify.element('전투 망치 재사용 대기가 없다', 'skill:전투 망치', 첫수치(스킬조각(줄들, '전투 망치'), ['재사용']) ?? 0, 0);
    const 확인4 = await verify.element('방패 오라 재사용 대기가 1.2초다', 'skill:방패 오라', 첫수치(스킬조각(줄들, '방패 오라'), ['재사용']), 1.2);
    const 확인8 = await verify.element('화살 쏘기 피해가 5 이다', 'skill:화살 쏘기', 첫수치(스킬조각(줄들, '화살 쏘기'), ['값']), 5);
    const 확인9 = await verify.element('화살 쏘기 사거리가 20 다', 'skill:화살 쏘기', 첫수치(스킬조각(줄들, '화살 쏘기'), ['사거리']), 20);
    const 확인10 = await verify.element('화살 쏘기 재사용 대기가 0.25초다', 'skill:화살 쏘기', 첫수치(스킬조각(줄들, '화살 쏘기'), ['재사용']), 0.25);
    const 확인11 = await verify.element('강화 사격 재사용 대기가 0.7초다', 'skill:강화 사격', 첫수치(스킬조각(줄들, '강화 사격'), ['재사용']), 0.7);
    const 확인12 = await verify.element('일제 사격 피해가 7 이다', 'skill:일제 사격', 첫수치(스킬조각(줄들, '일제 사격'), ['값']), 7);
    const 확인13 = await verify.element('일제 사격 사거리가 20 다', 'skill:일제 사격', 첫수치(스킬조각(줄들, '일제 사격'), ['사거리']), 20);
    const 확인14 = await verify.element('일제 사격 재사용 대기가 없다', 'skill:일제 사격', 첫수치(스킬조각(줄들, '일제 사격'), ['재사용']) ?? 0, 0);
    const 확인15 = await verify.element('마력탄 피해가 5 이다', 'skill:마력탄', 첫수치(스킬조각(줄들, '마력탄'), ['값']), 5);
    const 확인16 = await verify.element('마력탄 사거리가 20 다', 'skill:마력탄', 첫수치(스킬조각(줄들, '마력탄'), ['사거리']), 20);
    const 확인17 = await verify.element('마력탄 재사용 대기가 0.5초다', 'skill:마력탄', 첫수치(스킬조각(줄들, '마력탄'), ['재사용']), 0.5);
    const 확인18 = await verify.element('치유의 손길 회복이 250 이다', 'skill:치유의 손길', 첫수치(스킬조각(줄들, '치유의 손길'), ['값']), 250);
    const 확인19 = await verify.element('치유의 손길 사거리가 10 다', 'skill:치유의 손길', 첫수치(스킬조각(줄들, '치유의 손길'), ['사거리']), 10);
    const 확인20 = await verify.element('치유의 손길 재사용 대기가 없다', 'skill:치유의 손길', 첫수치(스킬조각(줄들, '치유의 손길'), ['재사용']) ?? 0, 0);
    await verify('「/gm data skill」을 보내면 탱커 · 궁수 · 마법사 스킬의 기본 수치 · 사거리 · 재사용 대기가 스킬 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14 && 확인15 && 확인16 && 확인17 && 확인18 && 확인19 && 확인20, true);
  });
});
