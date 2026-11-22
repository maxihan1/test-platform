import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 창열기 } from './helpers/dungeon.helper.js';
import { 창닫기, 창닫힘기다리기, 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-433',
  name: '창 오른쪽 아래 「닫기」를 누르면 창이 닫힌다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방 창을 열고 오른쪽 아래 「닫기」를 누른다', async () => {
    await 창열기(game, '가방');
    await verify('가방 창이 열린다', await 창열려있나(game, '가방'), true, { blocker: true });
    await 창닫기(game, '가방', '닫기');
    await verify('창 오른쪽 아래 「닫기」를 누르면 창이 닫힌다', await 창닫힘기다리기(game, '가방'), true);
  });

  await test.step('가방 창을 열고 창 바깥 어두운 곳을 누른다', async () => {
    await 창열기(game, '가방');
    await verify('가방 창이 다시 열린다', await 창열려있나(game, '가방'), true, { blocker: true });
    await 창닫기(game, '가방', '바깥');
    await verify('창 바깥의 어두운 곳을 누른 뒤 창이 닫힌다', await 창닫힘기다리기(game, '가방'), true);
  });

  await test.step('가방 창을 열고 메뉴 「가방」을 다시 누른다', async () => {
    await 창열기(game, '가방');
    await verify('가방 창이 한 번 더 열린다', await 창열려있나(game, '가방'), true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.메뉴누르기('가방');
    await verify('같은 메뉴 버튼을 다시 누른 뒤 열린 창이 닫힌다', await 창닫힘기다리기(game, '가방'), true);
  });
});
