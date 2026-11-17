import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글색읽기, 금색인가, 레벨업글 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-283',
  name: '레벨이 올라 큰 금색 「레벨 업!」이 뜨면 3초 안에 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('GM 명령으로 경험치 100 을 준다', async () => {
      const 창 = await 채팅창.열기(game);
      await 창.보내기('/gm exp 100');
      const 떴다 = await verify('「레벨 업!」이 뜬다', await game.waitFor(레벨업글, { timeoutMs: 10_000 }).then(
        () => true,
        () => false,
      ), true);
      const 찾은것 = await game.find(레벨업글);
      const 금색 = await verify('「레벨 업!」이 금색이다', 금색인가(await 글색읽기(game, 찾은것?.path ?? 레벨업글)), true);
      const 사라짐 = await verify(
        '「레벨 업!」이 3초 안에 사라진다',
        await game.waitFor(레벨업글, { gone: true, timeoutMs: 3_000 }).then(
          () => true,
          () => false,
        ),
        true,
      );
      await verify('레벨이 올라 큰 금색 「레벨 업!」이 뜨면 3초 안에 사라진다', 떴다 && 금색 && 사라짐, true);
      await 창.닫기누르기();
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
