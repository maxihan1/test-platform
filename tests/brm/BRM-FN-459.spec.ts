import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 몬스터줄, 수치들, 첫수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM자료, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-459',
  name: '「/gm data monster」를 보내면 임프 · 던지는 임프 · 보스 임프의 체력 · 피해 · 사거리 · 재사용 대기가 몬스터 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['monster:임프', 'monster:던지는 임프', 'monster:보스 임프'],
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
  await test.step('「/gm data monster」를 보낸다', async () => {
    const 줄들 = await GM자료(game, 'monster');
    const 임프 = 몬스터줄(줄들, '임프');
    const 던지는임프 = 몬스터줄(줄들, '던지는 임프');
    const 보스임프 = 몬스터줄(줄들, '보스 임프');
    await verify('몬스터 자료에 임프 · 던지는 임프 · 보스 임프 줄이 있다', 임프 !== null && 던지는임프 !== null && 보스임프 !== null, true, { blocker: true });
    const 확인1 = await verify.element('임프 체력이 15 다', 'monster:임프', 첫수치(임프, ['체력']), 15);
    const 확인2 = await verify.element('임프 피해가 15 다', 'monster:임프', 첫수치(임프, ['값']), 15);
    const 확인3 = await verify.element('임프 사거리가 2 다', 'monster:임프', 첫수치(임프, ['사거리']), 2);
    const 확인4 = await verify.element('임프 재사용 대기가 없다', 'monster:임프', 첫수치(임프, ['재사용']) ?? 0, 0);
    const 확인5 = await verify.element('던지는 임프 체력이 100 이다', 'monster:던지는 임프', 첫수치(던지는임프, ['체력']), 100);
    const 확인6 = await verify.element('던지는 임프 피해가 15 다', 'monster:던지는 임프', 첫수치(던지는임프, ['값']), 15);
    const 확인7 = await verify.element('던지는 임프 사거리가 8 이다', 'monster:던지는 임프', 첫수치(던지는임프, ['사거리']), 8);
    const 확인8 = await verify.element('던지는 임프 재사용 대기가 4초다', 'monster:던지는 임프', 첫수치(던지는임프, ['재사용']), 4);
    const 확인9 = await verify.element('보스 임프 체력이 500 이다', 'monster:보스 임프', 첫수치(보스임프, ['체력']), 500);
    const 확인10 = await verify.element('보스 임프 근접 공격 피해가 30 이다', 'monster:보스 임프', 수치들(보스임프, ['값'])[0], 30);
    const 확인11 = await verify.element('보스 임프 근접 공격 사거리가 4.5 다', 'monster:보스 임프', 수치들(보스임프, ['사거리'])[0], 4.5);
    const 확인12 = await verify.element('보스 임프 근접 공격 재사용 대기가 없다', 'monster:보스 임프', 수치들(보스임프, ['재사용'])[0] ?? 0, 0);
    const 확인13 = await verify.element('보스 임프 짓밟기 피해가 30 이다', 'monster:보스 임프', 수치들(보스임프, ['값'])[1], 30);
    const 확인14 = await verify.element('보스 임프 짓밟기 사거리가 15 다', 'monster:보스 임프', 수치들(보스임프, ['사거리'])[1], 15);
    const 확인15 = await verify.element('보스 임프 짓밟기 재사용 대기가 7.5초다', 'monster:보스 임프', 수치들(보스임프, ['재사용'])[1], 7.5);
    await verify('「/gm data monster」를 보내면 임프 · 던지는 임프 · 보스 임프의 체력 · 피해 · 사거리 · 재사용 대기가 몬스터 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14 && 확인15, true);
  });
});
