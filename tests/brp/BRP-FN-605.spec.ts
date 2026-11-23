import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비설정창 } from './pages/lobby-settings.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-605',
  name: '로비에서 설정 창을 열면 설정 창에 「Overall Volume」 막대가 보인다',
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

  await test.step('로비에서 소리 설정 톱니바퀴를 눌러 설정 창을 연다', async () => {
    const 설정 = 로비설정창.로비에서(game);
    await verify('설정 창이 뜬다', await 설정.열기(), true, { blocker: true });
    await verify('로비에서 설정 창을 열면 설정 창에 「Overall Volume」 막대가 보인다', await 설정.전체소리글읽기(), 'Overall Volume');
    await verify('설정 창에 「Music Volume」 막대가 보인다', await 설정.음악소리글읽기(), 'Music Volume');
    await verify('설정 창에 품질 버튼이 보인다', await 설정.품질버튼있나(), true);
    await verify('설정 창에 닫기 버튼이 보인다', await 설정.닫기버튼있나(), true);
    await verify('로비 설정 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', await 설정.배치문제(), []);
    await 설정.닫기();
  });
});
