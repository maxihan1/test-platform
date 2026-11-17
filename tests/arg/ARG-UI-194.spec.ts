import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 자리가맞나 } from './helpers/connect.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { QA공지치우기, 계정되돌리기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-194',
  name: '로그인 화면 위쪽에 공지 띠가 보인다',
  platforms: ['android'],
  precondition: ['「[QA]」 공지가 켜져 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 공지를 켠 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 공지만들기(admin, '[QA] 띠 시험', '띠 본문');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 공지 띠를 확인한다', async () => {
      const 떴다 = await verify('공지 띠가 보인다', await 공지띠.뜰때까지(game, '띠 시험', 75_000), true);
      const 위쪽 = await verify('공지 띠가 화면 위쪽에 있다', await 자리가맞나(game, 공지띠.글주소('띠 시험'), '아무', '위'), true);
      await verify('로그인 화면 위쪽에 공지 띠가 보인다', 떴다 && 위쪽, true);
    });
    await test.step('로그인해 로비 공지 띠를 확인한다', async () => {
      await 로비로(game, 아이디, 비밀번호);
      const 떴다 = await verify('공지 띠가 보인다', await 공지띠.뜰때까지(game, '띠 시험', 30_000), true);
      const 위쪽 = await verify('공지 띠가 화면 위쪽에 있다', await 자리가맞나(game, 공지띠.글주소('띠 시험'), '아무', '위'), true);
      await verify('로비 위쪽에 공지 띠가 보인다', 떴다 && 위쪽, true);
    });
    await test.step('던전에 들어가 공지 띠를 확인한다', async () => {
      await 던전으로(game, 아이디, 비밀번호);
      await verify('던전에서는 공지 띠가 보이지 않는다', await 공지띠.보이나(game, '띠 시험'), false);
    });
  } finally {
    await QA공지치우기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
