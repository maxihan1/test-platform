import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM경험치, GM레벨 } from './helpers/gm.helper.js';
import { 알림띠 } from './components/toast.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-136',
  name: '레벨이 오르면 화면 위쪽에 「레벨 업! Lv.」로 시작하는 알림이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:2'],
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

  await test.step('/gm level 1 뒤 /gm exp 100 을 준다', async () => {
    await GM레벨(game, 1);
    await GM경험치(game, 100);
    const 알림 = new 알림띠(game);
    const 떴다 = await 알림.뜰때까지('레벨 업! Lv.', 10_000);
    await verify('레벨 업 알림이 뜬다', 떴다, true, { blocker: true });
    await verify('레벨이 오르면 화면 위쪽에 「레벨 업! Lv.」로 시작하는 알림이 뜬다', (await 알림.글들()).some((글) => 글.startsWith('레벨 업! Lv.')), true);
  });
});
