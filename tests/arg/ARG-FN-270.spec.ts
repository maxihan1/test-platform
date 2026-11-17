import { defineCase, test, verify } from '@platform/kit';

import { QA공지치우기, 공지만들기, 실패걸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-270',
  name: '서버 상태 읽기에 실패하면 공지 띠에 바로 전 공지가 그대로 보인다',
  platforms: ['android'],
  precondition: ['「[QA]」 공지가 켜져 로그인 화면 공지 띠에 보인다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('[QA] 공지를 모두 치우고 공지를 켠 뒤 로그인 화면을 기다린다', async () => {
      await QA공지치우기(admin);
      await 공지만들기(admin, '[QA] 상태 읽기 시험', '상태 읽기 본문');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('공지 띠를 확인한다', async () => {
      await verify('공지 띠에 「[QA]」 공지가 보인다', await 공지띠.뜰때까지(game, '상태 읽기 시험', 75_000), true, { blocker: true });
    });

    await test.step('서버 상태 읽기를 실패시키고 1분 넘게 기다린다', async () => {
      await 실패걸기(admin, '/api/serverstatus');
      const 사라짐 = await 공지띠.사라질때까지(game, '상태 읽기 시험', 70_000);
      await verify('서버 상태 읽기에 실패하면 공지 띠에 바로 전 공지가 그대로 보인다', !사라짐 && (await 공지띠.보이나(game, '상태 읽기 시험')), true);
    });
  } finally {
    await QA공지치우기(admin);
  }
});
