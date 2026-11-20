import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨별수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-466',
  name: '「/gm level」로 레벨 1~4 를 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 1~4 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:1', 'level:2', 'level:3', 'level:4'],
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
  await test.step('「/gm level」로 레벨 1~4 를 차례로 맞추고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 레벨1 = await 레벨별수치(game, 1);
    const 확인1 = await verify.element('레벨 1 다음레벨이 100 이다', 'level:1', Number(레벨1['다음레벨']), 100);
    const 확인2 = await verify.element('레벨 1 공격 배율이 1 이다', 'level:1', Number(레벨1['공격배율']), 1);
    const 확인3 = await verify.element('레벨 1 방어율이 0 다', 'level:1', Number(레벨1['방어율']), 0);
    const 레벨2 = await 레벨별수치(game, 2);
    const 확인4 = await verify.element('레벨 2 다음레벨이 282 이다', 'level:2', Number(레벨2['다음레벨']), 282);
    const 확인5 = await verify.element('레벨 2 공격 배율이 1.03 이다', 'level:2', Number(레벨2['공격배율']), 1.03);
    const 확인6 = await verify.element('레벨 2 방어율이 0.01 다', 'level:2', Number(레벨2['방어율']), 0.01);
    const 레벨3 = await 레벨별수치(game, 3);
    const 확인7 = await verify.element('레벨 3 다음레벨이 519 이다', 'level:3', Number(레벨3['다음레벨']), 519);
    const 확인8 = await verify.element('레벨 3 공격 배율이 1.06 이다', 'level:3', Number(레벨3['공격배율']), 1.06);
    const 확인9 = await verify.element('레벨 3 방어율이 0.02 다', 'level:3', Number(레벨3['방어율']), 0.02);
    const 레벨4 = await 레벨별수치(game, 4);
    const 확인10 = await verify.element('레벨 4 다음레벨이 800 이다', 'level:4', Number(레벨4['다음레벨']), 800);
    const 확인11 = await verify.element('레벨 4 공격 배율이 1.09 이다', 'level:4', Number(레벨4['공격배율']), 1.09);
    const 확인12 = await verify.element('레벨 4 방어율이 0.03 다', 'level:4', Number(레벨4['방어율']), 0.03);
    await verify('「/gm level」로 레벨 1~4 를 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 1~4 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12, true);
  });
});
