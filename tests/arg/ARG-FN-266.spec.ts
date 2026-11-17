import { defineCase, test, verify } from '@platform/kit';

import { QA공지치우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-266',
  name: '공지가 둘이면 10초 주기로 공지 띠가 다음 공지로 넘어간다',
  platforms: ['android'],
  precondition: ['「[QA]」 공지 두 개가 켜져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 공지 두 개를 켠 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 공지만들기(admin, '[QA] 순환 하나', '순환 본문 하나');
      await 공지만들기(admin, '[QA] 순환 둘', '순환 본문 둘');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 공지 띠를 12초 동안 지켜본다', async () => {
      await verify('공지 띠가 보인다', await 공지띠.뜰때까지(game, '순환', 75_000), true, { blocker: true });
      const 지금 = await 공지띠.원문(game, '순환');
      const 다음 = 지금.includes('순환 하나') ? '순환 둘' : '순환 하나';
      await verify('공지가 둘이면 10초 주기로 공지 띠가 다음 공지로 넘어간다', await 공지띠.뜰때까지(game, 다음, 12_000), true);
    });
  } finally {
    await QA공지치우기(admin);
  }
});
