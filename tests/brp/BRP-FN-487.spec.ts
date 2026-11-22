import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리 } from './helpers/social.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-487',
  name: '채팅 띠를 누르면 로비와 던전에서 채팅 창이 열린다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }]);
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비와 던전에서 채팅 띠를 누른다', async () => {
    const 로비값 = await 채팅창.열기(game).then(() => true, () => false);
    const 로비열림 = await verify('로비에서 채팅 창이 열린다', 로비값, true);
    await (await 채팅창.열기(game)).닫기();
    await 던전입장(game, '탱커');
    const 던전열림 = await verify('던전에서 채팅 창이 열린다', await 채팅창.열기(game).then(() => true, () => false), true);
    await verify('채팅 띠를 누르면 로비와 던전에서 채팅 창이 열린다', 로비열림 && 던전열림, true);
  });
});
