import { defineCase, test, verify } from '@platform/kit';

import { QA공지치우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-263',
  name: '공지를 켜면 로그인 없이 1분 주기 안에 로그인 화면 공지 띠에 그 공지가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있고 공지가 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);

      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('운영 API 로 공지를 켜고 1분 넘게 기다린다', async () => {
      await 공지만들기(admin, '[QA] 공지 시험 하나', '공지 본문 하나');
      const 떴다 = await 공지띠.뜰때까지(game, '공지 시험 하나', 75_000);
      await verify('공지를 켜면 로그인 없이 1분 주기 안에 로그인 화면 공지 띠에 그 공지가 보인다', 떴다, true);
    });
  } finally {
    await QA공지치우기(admin);
  }
});
