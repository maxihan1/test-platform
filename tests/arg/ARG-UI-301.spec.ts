import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리가맞나 } from './helpers/connect.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-301',
  name: '로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다', '일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 던전에 들어와 있다'],
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
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 오른쪽 위를 확인한다', async () => {
      const 엑스 = await verify('「X」 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.닫기X), true);
      const 톱니 = await verify('톱니바퀴 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.톱니바퀴), true);
      const 엑스자리 = await verify('「X」 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.닫기X, '오른쪽', '위'), true);
      const 톱니자리 = await verify('톱니바퀴 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.톱니바퀴, '오른쪽', '위'), true);
      await verify('로그인 화면 오른쪽 위에 「X」 버튼과 톱니바퀴 버튼이 보인다', 엑스 && 톱니 && 엑스자리 && 톱니자리, true);
    });
    await test.step('일반 회원으로 로그인해 로비로 간다', async () => {
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비 오른쪽 위를 확인한다', async () => {
      const 엑스 = await verify('「X」 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.닫기X), true);
      const 톱니 = await verify('톱니바퀴 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.톱니바퀴), true);
      const 엑스자리 = await verify('「X」 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.닫기X, '오른쪽', '위'), true);
      const 톱니자리 = await verify('톱니바퀴 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.톱니바퀴, '오른쪽', '위'), true);
      await verify('로비 오른쪽 위에도 「X」 버튼과 톱니바퀴 버튼이 보인다', 엑스 && 톱니 && 엑스자리 && 톱니자리, true);
    });
    await test.step('일반 회원이 탱커로 던전에 들어간다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전 오른쪽 위를 확인한다', async () => {
      const 엑스 = await verify('「X」 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.닫기X), true);
      const 톱니 = await verify('톱니바퀴 버튼이 보인다', await 로그인화면.지금(game).보이나(로그인화면.톱니바퀴), true);
      const 엑스자리 = await verify('「X」 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.닫기X, '오른쪽', '위'), true);
      const 톱니자리 = await verify('톱니바퀴 버튼이 오른쪽 위에 있다', await 자리가맞나(game, 로그인화면.톱니바퀴, '오른쪽', '위'), true);
      await verify('던전 오른쪽 위에도 「X」 버튼과 톱니바퀴 버튼이 보인다', 엑스 && 톱니 && 엑스자리 && 톱니자리, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
