import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-463',
  name: '/gm level 23 ~ 30 으로 바꿔 가며 /gm stat 을 읽으면 레벨 23~30 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:23', 'level:24', 'level:25', 'level:26', 'level:27', 'level:28', 'level:29', 'level:30'],
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

  await test.step('/gm level 23 ~ 30 으로 바꿔 가며 /gm stat 을 읽는다', async () => {
    await GM레벨(game, 23);
    const 값23 = await GM스탯(game);
    const 레벨23 = await verify.element('레벨 23 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:23', { 다음레벨: 스탯숫자(값23, '다음레벨'), 공격배율: 스탯숫자(값23, '공격배율'), 방어율: 스탯숫자(값23, '방어율') }, { 다음레벨: 11030, 공격배율: 1.66, 방어율: 0.22 });
    await GM레벨(game, 24);
    const 값24 = await GM스탯(game);
    const 레벨24 = await verify.element('레벨 24 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:24', { 다음레벨: 스탯숫자(값24, '다음레벨'), 공격배율: 스탯숫자(값24, '공격배율'), 방어율: 스탯숫자(값24, '방어율') }, { 다음레벨: 11757, 공격배율: 1.69, 방어율: 0.23 });
    await GM레벨(game, 25);
    const 값25 = await GM스탯(game);
    const 레벨25 = await verify.element('레벨 25 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:25', { 다음레벨: 스탯숫자(값25, '다음레벨'), 공격배율: 스탯숫자(값25, '공격배율'), 방어율: 스탯숫자(값25, '방어율') }, { 다음레벨: 12500, 공격배율: 1.72, 방어율: 0.24 });
    await GM레벨(game, 26);
    const 값26 = await GM스탯(game);
    const 레벨26 = await verify.element('레벨 26 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:26', { 다음레벨: 스탯숫자(값26, '다음레벨'), 공격배율: 스탯숫자(값26, '공격배율'), 방어율: 스탯숫자(값26, '방어율') }, { 다음레벨: 13257, 공격배율: 1.75, 방어율: 0.25 });
    await GM레벨(game, 27);
    const 값27 = await GM스탯(game);
    const 레벨27 = await verify.element('레벨 27 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:27', { 다음레벨: 스탯숫자(값27, '다음레벨'), 공격배율: 스탯숫자(값27, '공격배율'), 방어율: 스탯숫자(값27, '방어율') }, { 다음레벨: 14029, 공격배율: 1.78, 방어율: 0.26 });
    await GM레벨(game, 28);
    const 값28 = await GM스탯(game);
    const 레벨28 = await verify.element('레벨 28 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:28', { 다음레벨: 스탯숫자(값28, '다음레벨'), 공격배율: 스탯숫자(값28, '공격배율'), 방어율: 스탯숫자(값28, '방어율') }, { 다음레벨: 14816, 공격배율: 1.81, 방어율: 0.27 });
    await GM레벨(game, 29);
    const 값29 = await GM스탯(game);
    const 레벨29 = await verify.element('레벨 29 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:29', { 다음레벨: 스탯숫자(값29, '다음레벨'), 공격배율: 스탯숫자(값29, '공격배율'), 방어율: 스탯숫자(값29, '방어율') }, { 다음레벨: 15616, 공격배율: 1.84, 방어율: 0.28 });
    await GM레벨(game, 30);
    const 값30 = await GM스탯(game);
    const 레벨30 = await verify.element('레벨 30 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:30', { 다음레벨: 스탯숫자(값30, '다음레벨'), 공격배율: 스탯숫자(값30, '공격배율'), 방어율: 스탯숫자(값30, '방어율') }, { 다음레벨: 0, 공격배율: 1.87, 방어율: 0.29 });
    await verify('/gm level 23 ~ 30 으로 바꿔 가며 /gm stat 을 읽으면 레벨 23~30 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다', 레벨23 && 레벨24 && 레벨25 && 레벨26 && 레벨27 && 레벨28 && 레벨29 && 레벨30, true);
  });
});
