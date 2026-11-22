import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { GM스탯 } from './helpers/gm.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-503',
  name: '접속한 모두가 확정하면 3초 안팎(6초 안)에 던전으로 넘어간다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    최대초: z.number().describe('던전으로 넘어가기까지 걸리는 시간의 상한(초)').default(6),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    await 로비로되돌리기(admin);
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  let 시작 = 0;
  let 로비: 로비화면 | null = null;
  await test.step('혼자 영웅을 확정한다', async () => {
    로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    const 카드 = await game.find(로비.자리주소(로비화면.직업자리['마법사']));
    await verify('확정하기 전에는 다른 카드를 누를 수 있다', 카드?.interactable, true, { blocker: true });
    await 로비.준비누르기();
    시작 = Date.now();
  });

  await test.step('혼자 영웅을 확정한 직후 다른 카드를 누를 수 있는지 본다', async () => {
    await verify('로비 화면을 잡아 두었다', 로비 !== null, true, { blocker: true });
    const 주소 = 로비?.자리주소(로비화면.직업자리['마법사']) ?? '';
    const 끝 = Date.now() + 2_000;
    let 누를수있나 = (await game.find(주소))?.interactable;
    while (누를수있나 !== false && Date.now() < 끝) 누를수있나 = (await game.find(주소))?.interactable;
    await verify('모두가 확정한 뒤에는 다른 카드를 누를 수 없다', 누를수있나, false);
  });

  await test.step('던전으로 넘어간 것을 확인한다', async () => {
    const 넘어갔다 = await game.waitFor(던전화면.안내창, { timeoutMs: 30_000 }).then(
      () => true,
      () => false,
    );
    const 걸린초 = (Date.now() - 시작) / 1000;
    await verify('던전 조작 안내 창이 뜬다', 넘어갔다, true, { blocker: true });
    await verify('접속한 모두가 확정하면 3초 안팎(6초 안)에 던전으로 넘어간다', 걸린초 <= expected.최대초, true);
    const 던전 = await 던전화면.안내창뜸(game);
    await 던전.안내창닫기();
    await verify('모두가 확정한 뒤에는 다른 카드를 눌러도 고른 영웅이 바뀌지 않는다', (await GM스탯(game))['직업'], '탱커');
  });
});
