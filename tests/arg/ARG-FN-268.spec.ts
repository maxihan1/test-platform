import { defineCase, test, verify } from '@platform/kit';

import { QA공지치우기, 공지만들기, 점검끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-268',
  name: '공지도 점검도 없으면 로그인 화면에 공지 띠가 보이지 않는다',
  platforms: ['android'],
  precondition: ['공지와 점검이 모두 꺼져 있다', '「[QA]」 공지 하나가 켜져 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 점검을 끈 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 점검끄기(admin);
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('로그인 화면 공지 띠를 확인한다', async () => {
      await verify('공지도 점검도 없으면 로그인 화면에 공지 띠가 보이지 않는다', await 화면.보이나(로그인화면.공지띠후보), false);
    });
    await test.step('「[QA]」 공지 하나를 켜고 로그인 화면 공지 띠를 확인한다', async () => {
      await 공지만들기(admin, '[QA] 하나 시험', '하나 본문');
      await verify('공지가 하나 켜져 있을 때는 공지 띠가 보인다', await 공지띠.뜰때까지(game, '하나 시험', 75_000), true);
    });
  } finally {
    await QA공지치우기(admin);
  }
});
