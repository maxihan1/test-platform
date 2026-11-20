import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨별수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-468',
  name: '「/gm level」로 레벨 14~22 를 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 14~22 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:14', 'level:15', 'level:16', 'level:17', 'level:18', 'level:19', 'level:20', 'level:21', 'level:22'],
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
  await test.step('「/gm level」로 레벨 14~22 를 차례로 맞추고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 레벨14 = await 레벨별수치(game, 14);
    const 확인1 = await verify.element('레벨 14 다음레벨이 5238 이다', 'level:14', Number(레벨14['다음레벨']), 5238);
    const 확인2 = await verify.element('레벨 14 공격 배율이 1.39 이다', 'level:14', Number(레벨14['공격배율']), 1.39);
    const 확인3 = await verify.element('레벨 14 방어율이 0.13 다', 'level:14', Number(레벨14['방어율']), 0.13);
    const 레벨15 = await 레벨별수치(game, 15);
    const 확인4 = await verify.element('레벨 15 다음레벨이 5809 이다', 'level:15', Number(레벨15['다음레벨']), 5809);
    const 확인5 = await verify.element('레벨 15 공격 배율이 1.42 이다', 'level:15', Number(레벨15['공격배율']), 1.42);
    const 확인6 = await verify.element('레벨 15 방어율이 0.14 다', 'level:15', Number(레벨15['방어율']), 0.14);
    const 레벨16 = await 레벨별수치(game, 16);
    const 확인7 = await verify.element('레벨 16 다음레벨이 6400 이다', 'level:16', Number(레벨16['다음레벨']), 6400);
    const 확인8 = await verify.element('레벨 16 공격 배율이 1.45 이다', 'level:16', Number(레벨16['공격배율']), 1.45);
    const 확인9 = await verify.element('레벨 16 방어율이 0.15 다', 'level:16', Number(레벨16['방어율']), 0.15);
    const 레벨17 = await 레벨별수치(game, 17);
    const 확인10 = await verify.element('레벨 17 다음레벨이 7009 이다', 'level:17', Number(레벨17['다음레벨']), 7009);
    const 확인11 = await verify.element('레벨 17 공격 배율이 1.48 이다', 'level:17', Number(레벨17['공격배율']), 1.48);
    const 확인12 = await verify.element('레벨 17 방어율이 0.16 다', 'level:17', Number(레벨17['방어율']), 0.16);
    const 레벨18 = await 레벨별수치(game, 18);
    const 확인13 = await verify.element('레벨 18 다음레벨이 7636 이다', 'level:18', Number(레벨18['다음레벨']), 7636);
    const 확인14 = await verify.element('레벨 18 공격 배율이 1.51 이다', 'level:18', Number(레벨18['공격배율']), 1.51);
    const 확인15 = await verify.element('레벨 18 방어율이 0.17 다', 'level:18', Number(레벨18['방어율']), 0.17);
    const 레벨19 = await 레벨별수치(game, 19);
    const 확인16 = await verify.element('레벨 19 다음레벨이 8281 이다', 'level:19', Number(레벨19['다음레벨']), 8281);
    const 확인17 = await verify.element('레벨 19 공격 배율이 1.54 이다', 'level:19', Number(레벨19['공격배율']), 1.54);
    const 확인18 = await verify.element('레벨 19 방어율이 0.18 다', 'level:19', Number(레벨19['방어율']), 0.18);
    const 레벨20 = await 레벨별수치(game, 20);
    const 확인19 = await verify.element('레벨 20 다음레벨이 8944 이다', 'level:20', Number(레벨20['다음레벨']), 8944);
    const 확인20 = await verify.element('레벨 20 공격 배율이 1.57 이다', 'level:20', Number(레벨20['공격배율']), 1.57);
    const 확인21 = await verify.element('레벨 20 방어율이 0.19 다', 'level:20', Number(레벨20['방어율']), 0.19);
    const 레벨21 = await 레벨별수치(game, 21);
    const 확인22 = await verify.element('레벨 21 다음레벨이 9623 이다', 'level:21', Number(레벨21['다음레벨']), 9623);
    const 확인23 = await verify.element('레벨 21 공격 배율이 1.6 이다', 'level:21', Number(레벨21['공격배율']), 1.6);
    const 확인24 = await verify.element('레벨 21 방어율이 0.2 다', 'level:21', Number(레벨21['방어율']), 0.2);
    const 레벨22 = await 레벨별수치(game, 22);
    const 확인25 = await verify.element('레벨 22 다음레벨이 10318 이다', 'level:22', Number(레벨22['다음레벨']), 10318);
    const 확인26 = await verify.element('레벨 22 공격 배율이 1.63 이다', 'level:22', Number(레벨22['공격배율']), 1.63);
    const 확인27 = await verify.element('레벨 22 방어율이 0.21 다', 'level:22', Number(레벨22['방어율']), 0.21);
    await verify('「/gm level」로 레벨 14~22 를 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 14~22 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14 && 확인15 && 확인16 && 확인17 && 확인18 && 확인19 && 확인20 && 확인21 && 확인22 && 확인23 && 확인24 && 확인25 && 확인26 && 확인27, true);
  });
});
