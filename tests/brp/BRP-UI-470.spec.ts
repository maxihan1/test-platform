import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비설정창 } from './pages/lobby-settings.page.js';

export const spec = defineCase({
  tcId: 'BRP-UI-470',
  name: '로비에서 소리 설정 톱니바퀴를 누르면 설정 창이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['zone:CharSelect'],
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

  await test.step('로비에서 소리 설정 톱니바퀴를 누른다', async () => {
    const 설정 = 로비설정창.로비에서(game);
    await 설정.톱니누르기();
    await verify('로비에서 소리 설정 톱니바퀴를 누르면 설정 창이 뜬다', await 설정.뜰때까지(), true);
    await 설정.닫기();
  });
});
