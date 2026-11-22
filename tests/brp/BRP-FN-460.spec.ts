import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-460',
  name: '/gm level 1 ~ 4 로 바꿔 가며 /gm stat 을 읽으면 레벨 1~4 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:1', 'level:2', 'level:3', 'level:4'],
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

  await test.step('/gm level 1 ~ 4 로 바꿔 가며 /gm stat 을 읽는다', async () => {
    await GM레벨(game, 1);
    const 값1 = await GM스탯(game);
    const 레벨1 = await verify.element('레벨 1 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:1', { 다음레벨: 스탯숫자(값1, '다음레벨'), 공격배율: 스탯숫자(값1, '공격배율'), 방어율: 스탯숫자(값1, '방어율') }, { 다음레벨: 100, 공격배율: 1.0, 방어율: 0.0 });
    await GM레벨(game, 2);
    const 값2 = await GM스탯(game);
    const 레벨2 = await verify.element('레벨 2 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:2', { 다음레벨: 스탯숫자(값2, '다음레벨'), 공격배율: 스탯숫자(값2, '공격배율'), 방어율: 스탯숫자(값2, '방어율') }, { 다음레벨: 282, 공격배율: 1.03, 방어율: 0.01 });
    await GM레벨(game, 3);
    const 값3 = await GM스탯(game);
    const 레벨3 = await verify.element('레벨 3 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:3', { 다음레벨: 스탯숫자(값3, '다음레벨'), 공격배율: 스탯숫자(값3, '공격배율'), 방어율: 스탯숫자(값3, '방어율') }, { 다음레벨: 519, 공격배율: 1.06, 방어율: 0.02 });
    await GM레벨(game, 4);
    const 값4 = await GM스탯(game);
    const 레벨4 = await verify.element('레벨 4 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표와 같다', 'level:4', { 다음레벨: 스탯숫자(값4, '다음레벨'), 공격배율: 스탯숫자(값4, '공격배율'), 방어율: 스탯숫자(값4, '방어율') }, { 다음레벨: 800, 공격배율: 1.09, 방어율: 0.03 });
    await verify('/gm level 1 ~ 4 로 바꿔 가며 /gm stat 을 읽으면 레벨 1~4 의 다음 레벨까지 경험치 · 공격 배율 · 방어율이 레벨 곡선 표대로다', 레벨1 && 레벨2 && 레벨3 && 레벨4, true);
  });
});
