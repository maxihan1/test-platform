import { defineCase, test, verify } from '@platform/kit';

import { 색이름 } from './helpers/economy.helper.js';
import { QA공지치우기, 공지만들기, 점검끄기, 점검켜기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 공지띠 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-271',
  name: '점검이 걸리면 로그인 화면 공지 띠에 「[점검] <안내>」가 보인다',
  platforms: ['android'],
  precondition: ['점검과 「[QA]」 공지가 꺼진 채 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin }) => {
  const 안내 = '자동 시험 점검 안내';
  const 공지글 = '켜 둔 공지 시험';
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

    await test.step('운영 API 로 「[QA]」 공지를 켜고 점검을 켠 뒤 공지 띠를 기다린다', async () => {
      await 공지만들기(admin, `[QA] ${공지글}`, '점검 중 공지 본문');
      await 점검켜기(admin, 안내);
      await 공지띠.띠글이될때까지(game, `[점검] ${안내}`, 75_000);
      await verify('점검이 걸리면 로그인 화면 공지 띠에 「[점검] <안내>」가 보인다', await 공지띠.띠글(game), `[점검] ${안내}`);
      await verify('점검 안내가 뜬 공지 띠 바탕이 빨간색이다', 색이름(await 공지띠.띠바탕색(game)), '빨강');
      await verify('점검이 걸린 동안 켜 둔 「[QA]」 공지는 공지 띠에 보이지 않는다', (await 공지띠.띠글(game)).includes(공지글), false);
    });
  } finally {
    await 점검끄기(admin);
    await QA공지치우기(admin);
  }
});
