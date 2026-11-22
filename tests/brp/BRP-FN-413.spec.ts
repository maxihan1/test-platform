import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지올리기, 점검끄기, QA공지모두지우기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-413',
  name: '공지도 점검도 없으면 로그인 화면 공지 띠가 숨어 있다',
  platforms: ['windows'],
  precondition: ['켜진 공지와 점검이 하나도 없다', '켜진 공지가 하나다'],
  techniques: ['경계값 분석'],
  params: z.object({
    noticeTitle: z.string().describe('올릴 공지 제목 — [QA] 로 시작').default('[QA] 로그인 화면 공지'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 제목 = params.noticeTitle;
  await test.cleanup('[QA] 공지를 지우고 점검을 끄기', async () => {
    await QA공지모두지우기(admin);
    await 점검끄기(admin);
  });

  await test.step('켜진 공지와 점검이 없는 채 게임을 다시 켠 것을 확인한다', async () => {
    await QA공지모두지우기(admin);
    await 점검끄기(admin);
    await game.restart();
    const 화면 = await 로그인화면.열림(game);
    await verify('로그인 화면이 열린다', await 화면.게임시작눌리나(), true, { blocker: true });
  });

  await test.step('로그인 화면 공지 띠를 읽는다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await verify('공지도 점검도 없으면 로그인 화면 공지 띠가 숨어 있다', await 화면.공지띠보임(), false);
  });

  await test.step('공지를 하나 켠 뒤 로그인 화면 공지 띠를 읽는다', async () => {
    await 공지올리기(admin, 제목, '로그인 화면 공지 띠 확인');
    await game.restart();
    const 화면 = await 로그인화면.열림(game);
    await verify('켜진 공지가 하나 생길 때 로그인 화면 공지 띠가 보인다', await 화면.공지띠뜰때까지(20_000), true);
  });
});
