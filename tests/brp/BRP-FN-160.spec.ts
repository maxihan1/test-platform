import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스처치, GM보스방가기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-160',
  name: '보스를 잡으면 「보스 처치!」와 「획득」이 든 알림이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 보스 방에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('일반 회원이 탱커로 혼자 보스 방에 있는 것을 확인한다', async () => {
    await GM보스방가기(game);
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('/gm killboss 로 보스를 잡는다', async () => {
    const 알림 = new 알림띠(game);
    await 채팅창.열기(game);
    await GM보스처치(game);
    const 줄 = await 알림.그글줄주소('보스 처치!', 10_000);
    const 처치 = await verify('「보스 처치!」가 든 알림이 뜬다', 줄 !== null, true);
    const 획득 = await verify('그 알림에 「획득」이 들어 있다', 줄 !== null && (await game.text(줄)).includes('획득'), true);
    await verify('보스를 잡으면 「보스 처치!」와 「획득」이 든 알림이 뜬다', 처치 && 획득, true);
  });
});
