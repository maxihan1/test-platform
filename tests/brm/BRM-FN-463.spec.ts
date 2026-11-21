import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스킬조각, 첫수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM자료, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-463',
  name: '「/gm data skill」을 보내면 도적 · 공통 스킬의 기본 수치 · 사거리 · 재사용 대기가 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['skill:급소 찌르기', 'skill:질주 공격', 'skill:은신', 'skill:부활', 'skill:들기', 'skill:내려놓기'],
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
  await test.step('「/gm data skill」을 보내 도적 · 공통 스킬 줄을 읽는다', async () => {
    const 줄들 = await GM자료(game, 'skill');
    const 확인1 = await verify.element('급소 찌르기 피해가 15 이다', 'skill:급소 찌르기', 첫수치(스킬조각(줄들, '급소 찌르기'), ['값']), 15);
    const 확인2 = await verify.element('급소 찌르기 사거리가 2 다', 'skill:급소 찌르기', 첫수치(스킬조각(줄들, '급소 찌르기'), ['사거리']), 2);
    const 확인3 = await verify.element('급소 찌르기 재사용 대기가 없다', 'skill:급소 찌르기', 첫수치(스킬조각(줄들, '급소 찌르기'), ['재사용']) ?? 0, 0);
    const 확인4 = await verify.element('질주 공격 피해가 30 이다', 'skill:질주 공격', 첫수치(스킬조각(줄들, '질주 공격'), ['값']), 30);
    const 확인5 = await verify.element('질주 공격 사거리가 20 다', 'skill:질주 공격', 첫수치(스킬조각(줄들, '질주 공격'), ['사거리']), 20);
    const 확인6 = await verify.element('질주 공격 재사용 대기가 2초다', 'skill:질주 공격', 첫수치(스킬조각(줄들, '질주 공격'), ['재사용']), 2);
    const 확인7 = await verify.element('은신 재사용 대기가 없다', 'skill:은신', 첫수치(스킬조각(줄들, '은신'), ['재사용']) ?? 0, 0);
    const 확인8 = await verify.element('부활 체력이 400 이다', 'skill:부활', 첫수치(스킬조각(줄들, '부활'), ['값']), 400);
    const 확인9 = await verify.element('부활 사거리가 2 다', 'skill:부활', 첫수치(스킬조각(줄들, '부활'), ['사거리']), 2);
    const 확인10 = await verify.element('부활 재사용 대기가 없다', 'skill:부활', 첫수치(스킬조각(줄들, '부활'), ['재사용']) ?? 0, 0);
    const 확인11 = await verify.element('들기 사거리가 2 다', 'skill:들기', 첫수치(스킬조각(줄들, '들기'), ['사거리']), 2);
    const 확인12 = await verify.element('들기 재사용 대기가 1.5초다', 'skill:들기', 첫수치(스킬조각(줄들, '들기'), ['재사용']), 1.5);
    const 확인13 = await verify.element('내려놓기 사거리가 2 다', 'skill:내려놓기', 첫수치(스킬조각(줄들, '내려놓기'), ['사거리']), 2);
    const 확인14 = await verify.element('내려놓기 재사용 대기가 1.5초다', 'skill:내려놓기', 첫수치(스킬조각(줄들, '내려놓기'), ['재사용']), 1.5);
    await verify('「/gm data skill」을 보내면 도적 · 공통 스킬의 기본 수치 · 사거리 · 재사용 대기가 스킬 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14, true);
  });
});
