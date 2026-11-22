import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-462',
  name: '/gm level 14 ~ 22 로 바꿔 가며 /gm stat 을 읽으면 레벨 14~22 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:14', 'level:15', 'level:16', 'level:17', 'level:18', 'level:19', 'level:20', 'level:21', 'level:22'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm level 14 ~ 22 로 바꿔 가며 /gm stat 을 읽는다', async () => {
    await GM레벨(game, 14);
    const 값14 = await GM스탯(game);
    const 레벨14 = await verify.element('레벨 14 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:14', { 다음레벨: 스탯숫자(값14, '다음레벨'), 공격배율: 스탯숫자(값14, '공격배율'), 방어율: 스탯숫자(값14, '방어율') }, { 다음레벨: 5238, 공격배율: 1.39, 방어율: 0.13 });
    await GM레벨(game, 15);
    const 값15 = await GM스탯(game);
    const 레벨15 = await verify.element('레벨 15 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:15', { 다음레벨: 스탯숫자(값15, '다음레벨'), 공격배율: 스탯숫자(값15, '공격배율'), 방어율: 스탯숫자(값15, '방어율') }, { 다음레벨: 5809, 공격배율: 1.42, 방어율: 0.14 });
    await GM레벨(game, 16);
    const 값16 = await GM스탯(game);
    const 레벨16 = await verify.element('레벨 16 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:16', { 다음레벨: 스탯숫자(값16, '다음레벨'), 공격배율: 스탯숫자(값16, '공격배율'), 방어율: 스탯숫자(값16, '방어율') }, { 다음레벨: 6400, 공격배율: 1.45, 방어율: 0.15 });
    await GM레벨(game, 17);
    const 값17 = await GM스탯(game);
    const 레벨17 = await verify.element('레벨 17 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:17', { 다음레벨: 스탯숫자(값17, '다음레벨'), 공격배율: 스탯숫자(값17, '공격배율'), 방어율: 스탯숫자(값17, '방어율') }, { 다음레벨: 7009, 공격배율: 1.48, 방어율: 0.16 });
    await GM레벨(game, 18);
    const 값18 = await GM스탯(game);
    const 레벨18 = await verify.element('레벨 18 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:18', { 다음레벨: 스탯숫자(값18, '다음레벨'), 공격배율: 스탯숫자(값18, '공격배율'), 방어율: 스탯숫자(값18, '방어율') }, { 다음레벨: 7636, 공격배율: 1.51, 방어율: 0.17 });
    await GM레벨(game, 19);
    const 값19 = await GM스탯(game);
    const 레벨19 = await verify.element('레벨 19 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:19', { 다음레벨: 스탯숫자(값19, '다음레벨'), 공격배율: 스탯숫자(값19, '공격배율'), 방어율: 스탯숫자(값19, '방어율') }, { 다음레벨: 8281, 공격배율: 1.54, 방어율: 0.18 });
    await GM레벨(game, 20);
    const 값20 = await GM스탯(game);
    const 레벨20 = await verify.element('레벨 20 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:20', { 다음레벨: 스탯숫자(값20, '다음레벨'), 공격배율: 스탯숫자(값20, '공격배율'), 방어율: 스탯숫자(값20, '방어율') }, { 다음레벨: 8944, 공격배율: 1.57, 방어율: 0.19 });
    await GM레벨(game, 21);
    const 값21 = await GM스탯(game);
    const 레벨21 = await verify.element('레벨 21 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:21', { 다음레벨: 스탯숫자(값21, '다음레벨'), 공격배율: 스탯숫자(값21, '공격배율'), 방어율: 스탯숫자(값21, '방어율') }, { 다음레벨: 9623, 공격배율: 1.6, 방어율: 0.2 });
    await GM레벨(game, 22);
    const 값22 = await GM스탯(game);
    const 레벨22 = await verify.element('레벨 22 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:22', { 다음레벨: 스탯숫자(값22, '다음레벨'), 공격배율: 스탯숫자(값22, '공격배율'), 방어율: 스탯숫자(값22, '방어율') }, { 다음레벨: 10318, 공격배율: 1.63, 방어율: 0.21 });
    await verify('/gm level 14 ~ 22 로 바꿔 가며 /gm stat 을 읽으면 레벨 14~22 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다', 레벨14 && 레벨15 && 레벨16 && 레벨17 && 레벨18 && 레벨19 && 레벨20 && 레벨21 && 레벨22, true);
  });
});
