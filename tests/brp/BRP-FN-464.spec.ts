import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방에서끼기 } from './helpers/dungeon.helper.js';
import { GM골드, GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-464',
  name: '레벨 5 에 「강철 롱소드」를 끼면 공격 배율이 1 + 0.03 × 4 + 0.12 = 1.24 다',
  platforms: ['windows'],
  precondition: ['일반 회원이 레벨 5 로 「강철 롱소드」를 장착하고 로비에 있다'],
  elements: ['level:5', 'item:강철 롱소드'],
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

  await test.step('일반 회원이 레벨 5 로 「강철 롱소드」를 장착한 것을 확인한다', async () => {
    await GM골드(game, 5000);
    const 장착글 = await 가방에서끼기(game, 1, '강철 롱소드', '무기');
    await verify('장착 칸에 「강철 롱소드」가 보인다', 장착글.includes('강철 롱소드'), true, { blocker: true });
    await GM레벨(game, 5);
  });

  await test.step('/gm stat 으로 공격 배율을 읽는다', async () => {
    const 값 = await GM스탯(game);
    await verify('/gm stat 레벨이 5 다', 스탯숫자(값, '레벨'), 5, { blocker: true });
    await verify('레벨 5 에 「강철 롱소드」를 끼면 공격 배율이 1 + 0.03 × 4 + 0.12 = 1.24 다', 스탯숫자(값, '공격배율'), 1.24);
  });
});
