import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-461',
  name: '/gm level 5 ~ 13 으로 바꿔 가며 /gm stat 을 읽으면 레벨 5~13 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:5', 'level:6', 'level:7', 'level:8', 'level:9', 'level:10', 'level:11', 'level:12', 'level:13'],
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

  await test.step('/gm level 5 ~ 13 으로 바꿔 가며 /gm stat 을 읽는다', async () => {
    await GM레벨(game, 5);
    const 값5 = await GM스탯(game);
    const 레벨5 = await verify.element('레벨 5 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:5', { 다음레벨: 스탯숫자(값5, '다음레벨'), 공격배율: 스탯숫자(값5, '공격배율'), 방어율: 스탯숫자(값5, '방어율') }, { 다음레벨: 1118, 공격배율: 1.12, 방어율: 0.04 });
    await GM레벨(game, 6);
    const 값6 = await GM스탯(game);
    const 레벨6 = await verify.element('레벨 6 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:6', { 다음레벨: 스탯숫자(값6, '다음레벨'), 공격배율: 스탯숫자(값6, '공격배율'), 방어율: 스탯숫자(값6, '방어율') }, { 다음레벨: 1469, 공격배율: 1.15, 방어율: 0.05 });
    await GM레벨(game, 7);
    const 값7 = await GM스탯(game);
    const 레벨7 = await verify.element('레벨 7 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:7', { 다음레벨: 스탯숫자(값7, '다음레벨'), 공격배율: 스탯숫자(값7, '공격배율'), 방어율: 스탯숫자(값7, '방어율') }, { 다음레벨: 1852, 공격배율: 1.18, 방어율: 0.06 });
    await GM레벨(game, 8);
    const 값8 = await GM스탯(game);
    const 레벨8 = await verify.element('레벨 8 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:8', { 다음레벨: 스탯숫자(값8, '다음레벨'), 공격배율: 스탯숫자(값8, '공격배율'), 방어율: 스탯숫자(값8, '방어율') }, { 다음레벨: 2262, 공격배율: 1.21, 방어율: 0.07 });
    await GM레벨(game, 9);
    const 값9 = await GM스탯(game);
    const 레벨9 = await verify.element('레벨 9 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:9', { 다음레벨: 스탯숫자(값9, '다음레벨'), 공격배율: 스탯숫자(값9, '공격배율'), 방어율: 스탯숫자(값9, '방어율') }, { 다음레벨: 2700, 공격배율: 1.24, 방어율: 0.08 });
    await GM레벨(game, 10);
    const 값10 = await GM스탯(game);
    const 레벨10 = await verify.element('레벨 10 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:10', { 다음레벨: 스탯숫자(값10, '다음레벨'), 공격배율: 스탯숫자(값10, '공격배율'), 방어율: 스탯숫자(값10, '방어율') }, { 다음레벨: 3162, 공격배율: 1.27, 방어율: 0.09 });
    await GM레벨(game, 11);
    const 값11 = await GM스탯(game);
    const 레벨11 = await verify.element('레벨 11 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:11', { 다음레벨: 스탯숫자(값11, '다음레벨'), 공격배율: 스탯숫자(값11, '공격배율'), 방어율: 스탯숫자(값11, '방어율') }, { 다음레벨: 3648, 공격배율: 1.3, 방어율: 0.1 });
    await GM레벨(game, 12);
    const 값12 = await GM스탯(game);
    const 레벨12 = await verify.element('레벨 12 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:12', { 다음레벨: 스탯숫자(값12, '다음레벨'), 공격배율: 스탯숫자(값12, '공격배율'), 방어율: 스탯숫자(값12, '방어율') }, { 다음레벨: 4156, 공격배율: 1.33, 방어율: 0.11 });
    await GM레벨(game, 13);
    const 값13 = await GM스탯(game);
    const 레벨13 = await verify.element('레벨 13 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:13', { 다음레벨: 스탯숫자(값13, '다음레벨'), 공격배율: 스탯숫자(값13, '공격배율'), 방어율: 스탯숫자(값13, '방어율') }, { 다음레벨: 4687, 공격배율: 1.36, 방어율: 0.12 });
    await verify('/gm level 5 ~ 13 으로 바꿔 가며 /gm stat 을 읽으면 레벨 5~13 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다', 레벨5 && 레벨6 && 레벨7 && 레벨8 && 레벨9 && 레벨10 && 레벨11 && 레벨12 && 레벨13, true);
  });
});
