import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-054',
  name: '던전에 들어가면 제목이 「보스를 쓰러뜨리세요!」이고 「확인」 버튼이 있는 조작 안내 창이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('「준비!」를 눌러 던전에 들어간다', async () => {
      const 화면 = await 던전으로(game, 아이디, 비밀번호, 0, false);
      await verify('던전에 조작 안내 창이 보인다', await 화면.뜰때까지(던전화면.조작안내), true, { blocker: true });
      const 제목 = await verify('조작 안내 창 제목이 「보스를 쓰러뜨리세요!」다', await 화면.글(던전화면.조작안내제목), '보스를 쓰러뜨리세요!');
      const 확인 = await verify('조작 안내 창 버튼이 「확인」이다', await 화면.글(던전화면.조작안내확인글), '확인');
      await verify('던전에 들어가면 제목이 「보스를 쓰러뜨리세요!」이고 「확인」 버튼이 있는 조작 안내 창이 보인다', 제목 && 확인, true);
      const 배치 = await game.layout(던전화면.조작안내);
      await verify('조작 안내 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
