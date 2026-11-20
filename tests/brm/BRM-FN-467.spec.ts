import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨별수치 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-467',
  name: '「/gm level」로 레벨 5~13 을 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 5~13 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:5', 'level:6', 'level:7', 'level:8', 'level:9', 'level:10', 'level:11', 'level:12', 'level:13'],
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
  await test.step('「/gm level」로 레벨 5~13 을 차례로 맞추고 「/gm stat」 첫 줄을 읽는다', async () => {
    const 레벨5 = await 레벨별수치(game, 5);
    const 확인1 = await verify.element('레벨 5 다음레벨이 1118 이다', 'level:5', Number(레벨5['다음레벨']), 1118);
    const 확인2 = await verify.element('레벨 5 공격 배율이 1.12 이다', 'level:5', Number(레벨5['공격배율']), 1.12);
    const 확인3 = await verify.element('레벨 5 방어율이 0.04 다', 'level:5', Number(레벨5['방어율']), 0.04);
    const 레벨6 = await 레벨별수치(game, 6);
    const 확인4 = await verify.element('레벨 6 다음레벨이 1469 이다', 'level:6', Number(레벨6['다음레벨']), 1469);
    const 확인5 = await verify.element('레벨 6 공격 배율이 1.15 이다', 'level:6', Number(레벨6['공격배율']), 1.15);
    const 확인6 = await verify.element('레벨 6 방어율이 0.05 다', 'level:6', Number(레벨6['방어율']), 0.05);
    const 레벨7 = await 레벨별수치(game, 7);
    const 확인7 = await verify.element('레벨 7 다음레벨이 1852 이다', 'level:7', Number(레벨7['다음레벨']), 1852);
    const 확인8 = await verify.element('레벨 7 공격 배율이 1.18 이다', 'level:7', Number(레벨7['공격배율']), 1.18);
    const 확인9 = await verify.element('레벨 7 방어율이 0.06 다', 'level:7', Number(레벨7['방어율']), 0.06);
    const 레벨8 = await 레벨별수치(game, 8);
    const 확인10 = await verify.element('레벨 8 다음레벨이 2262 이다', 'level:8', Number(레벨8['다음레벨']), 2262);
    const 확인11 = await verify.element('레벨 8 공격 배율이 1.21 이다', 'level:8', Number(레벨8['공격배율']), 1.21);
    const 확인12 = await verify.element('레벨 8 방어율이 0.07 다', 'level:8', Number(레벨8['방어율']), 0.07);
    const 레벨9 = await 레벨별수치(game, 9);
    const 확인13 = await verify.element('레벨 9 다음레벨이 2700 이다', 'level:9', Number(레벨9['다음레벨']), 2700);
    const 확인14 = await verify.element('레벨 9 공격 배율이 1.24 이다', 'level:9', Number(레벨9['공격배율']), 1.24);
    const 확인15 = await verify.element('레벨 9 방어율이 0.08 다', 'level:9', Number(레벨9['방어율']), 0.08);
    const 레벨10 = await 레벨별수치(game, 10);
    const 확인16 = await verify.element('레벨 10 다음레벨이 3162 이다', 'level:10', Number(레벨10['다음레벨']), 3162);
    const 확인17 = await verify.element('레벨 10 공격 배율이 1.27 이다', 'level:10', Number(레벨10['공격배율']), 1.27);
    const 확인18 = await verify.element('레벨 10 방어율이 0.09 다', 'level:10', Number(레벨10['방어율']), 0.09);
    const 레벨11 = await 레벨별수치(game, 11);
    const 확인19 = await verify.element('레벨 11 다음레벨이 3648 이다', 'level:11', Number(레벨11['다음레벨']), 3648);
    const 확인20 = await verify.element('레벨 11 공격 배율이 1.3 이다', 'level:11', Number(레벨11['공격배율']), 1.3);
    const 확인21 = await verify.element('레벨 11 방어율이 0.1 다', 'level:11', Number(레벨11['방어율']), 0.1);
    const 레벨12 = await 레벨별수치(game, 12);
    const 확인22 = await verify.element('레벨 12 다음레벨이 4156 이다', 'level:12', Number(레벨12['다음레벨']), 4156);
    const 확인23 = await verify.element('레벨 12 공격 배율이 1.33 이다', 'level:12', Number(레벨12['공격배율']), 1.33);
    const 확인24 = await verify.element('레벨 12 방어율이 0.11 다', 'level:12', Number(레벨12['방어율']), 0.11);
    const 레벨13 = await 레벨별수치(game, 13);
    const 확인25 = await verify.element('레벨 13 다음레벨이 4687 이다', 'level:13', Number(레벨13['다음레벨']), 4687);
    const 확인26 = await verify.element('레벨 13 공격 배율이 1.36 이다', 'level:13', Number(레벨13['공격배율']), 1.36);
    const 확인27 = await verify.element('레벨 13 방어율이 0.12 다', 'level:13', Number(레벨13['방어율']), 0.12);
    await verify('「/gm level」로 레벨 5~13 을 차례로 맞추고 「/gm stat」 첫 줄을 읽으면 레벨 5~13 의 다음레벨 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 확인1 && 확인2 && 확인3 && 확인4 && 확인5 && 확인6 && 확인7 && 확인8 && 확인9 && 확인10 && 확인11 && 확인12 && 확인13 && 확인14 && 확인15 && 확인16 && 확인17 && 확인18 && 확인19 && 확인20 && 확인21 && 확인22 && 확인23 && 확인24 && 확인25 && 확인26 && 확인27, true);
  });
});
