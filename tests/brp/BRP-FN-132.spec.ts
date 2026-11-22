import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM경험치, GM레벨, 색글떼기 } from './helpers/gm.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-132',
  name: '/gm level 30 뒤 /gm exp 100000 을 주면 레벨 30 에서 경험치를 더 받아도 레벨이 「Lv.30」 그대로다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:30'],
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

  await test.step('/gm level 30 뒤 /gm exp 100000 을 준다', async () => {
    await GM레벨(game, 30);
    await GM경험치(game, 100000);
    await verify('/gm level 30 뒤 /gm exp 100000 을 주면 레벨 30 에서 경험치를 더 받아도 레벨이 「Lv.30」 그대로다', 색글떼기(await new 공통HUD(game).레벨이름()).split(/\s+/)[0], 'Lv.30');
  });
});
