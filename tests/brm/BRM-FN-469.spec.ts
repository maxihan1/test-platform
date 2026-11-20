import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨별수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-469',
  name: '「/gm level」로 레벨 23~30 을 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 23~30 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:23', 'level:24', 'level:25', 'level:26', 'level:27', 'level:28', 'level:29', 'level:30'],
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
  await test.step('「/gm level」로 레벨 23~30 을 차례로 맞추고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 레벨23 = await 레벨별수치(game, 23);
    const 확인1 = await verify.element('레벨 23 다음레벨이 11030 이다', 'level:23', Number(레벨23['다음레벨']), 11030);
    const 확인2 = await verify.element('레벨 23 공격 배율이 1.66 이다', 'level:23', Number(레벨23['공격배율']), 1.66);
    const 확인3 = await verify.element('레벨 23 방어율이 0.22 다', 'level:23', Number(레벨23['방어율']), 0.22);
    const 레벨24 = await 레벨별수치(game, 24);
    const 확인4 = await verify.element('레벨 24 다음레벨이 11757 이다', 'level:24', Number(레벨24['다음레벨']), 11757);
    const 확인5 = await verify.element('레벨 24 공격 배율이 1.69 이다', 'level:24', Number(레벨24['공격배율']), 1.69);
    const 확인6 = await verify.element('레벨 24 방어율이 0.23 다', 'level:24', Number(레벨24['방어율']), 0.23);
    const 레벨25 = await 레벨별수치(game, 25);
    const 확인7 = await verify.element('레벨 25 다음레벨이 12500 이다', 'level:25', Number(레벨25['다음레벨']), 12500);
    const 확인8 = await verify.element('레벨 25 공격 배율이 1.72 이다', 'level:25', Number(레벨25['공격배율']), 1.72);
    const 확인9 = await verify.element('레벨 25 방어율이 0.24 다', 'level:25', Number(레벨25['방어율']), 0.24);
    const 레벨26 = await 레벨별수치(game, 26);
    const 확인10 = await verify.element('레벨 26 다음레벨이 13257 이다', 'level:26', Number(레벨26['다음레벨']), 13257);
    const 확인11 = await verify.element('레벨 26 공격 배율이 1.75 이다', 'level:26', Number(레벨26['공격배율']), 1.75);
    const 확인12 = await verify.element('레벨 26 방어율이 0.25 다', 'level:26', Number(레벨26['방어율']), 0.25);
    const 레벨27 = await 레벨별수치(game, 27);
    const 확인13 = await verify.element('레벨 27 다음레벨이 14029 이다', 'level:27', Number(레벨27['다음레벨']), 14029);
    const 확인14 = await verify.element('레벨 27 공격 배율이 1.78 이다', 'level:27', Number(레벨27['공격배율']), 1.78);
    const 확인15 = await verify.element('레벨 27 방어율이 0.26 다', 'level:27', Number(레벨27['방어율']), 0.26);
    const 레벨28 = await 레벨별수치(game, 28);
    const 확인16 = await verify.element('레벨 28 다음레벨이 14816 이다', 'level:28', Number(레벨28['다음레벨']), 14816);
    const 확인17 = await verify.element('레벨 28 공격 배율이 1.81 이다', 'level:28', Number(레벨28['공격배율']), 1.81);
    const 확인18 = await verify.element('레벨 28 방어율이 0.27 다', 'level:28', Number(레벨28['방어율']), 0.27);
    const 레벨29 = await 레벨별수치(game, 29);
    const 확인19 = await verify.element('레벨 29 다음레벨이 15616 이다', 'level:29', Number(레벨29['다음레벨']), 15616);
    const 확인20 = await verify.element('레벨 29 공격 배율이 1.84 이다', 'level:29', Number(레벨29['공격배율']), 1.84);
    const 확인21 = await verify.element('레벨 29 방어율이 0.28 다', 'level:29', Number(레벨29['방어율']), 0.28);
    const 레벨30 = await 레벨별수치(game, 30);
    const 확인22 = await verify.element('레벨 30 다음레벨이 0 이다', 'level:30', Number(레벨30['다음레벨']), 0);
    const 확인23 = await verify.element('레벨 30 공격 배율이 1.87 이다', 'level:30', Number(레벨30['공격배율']), 1.87);
    const 확인24 = await verify.element('레벨 30 방어율이 0.29 다', 'level:30', Number(레벨30['방어율']), 0.29);
    await verify('「/gm level」로 레벨 23~30 을 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 23~30 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14 && 확인15 && 확인16 && 확인17 && 확인18 && 확인19 && 확인20 && 확인21 && 확인22 && 확인23 && 확인24, true);
  });
});
