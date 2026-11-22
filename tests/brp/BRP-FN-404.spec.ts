import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지올리기, 점검끄기, QA공지모두지우기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-404',
  name: '공지를 켜 두면 로그인하지 않은 로그인 화면 공지 띠에 그 공지 제목이 보인다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 하나가 켜져 있다'],
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

  await test.step('[QA] 공지 하나를 켜고 게임을 다시 켠 것을 확인한다', async () => {
    await 공지올리기(admin, 제목, '로그인 화면 공지 띠 확인');
    await game.restart();
    const 화면 = await 로그인화면.열림(game);
    await verify('로그인 화면 공지 띠가 뜬다', await 화면.공지띠뜰때까지(20_000), true, { blocker: true });
  });

  await test.step('로그인하지 않은 채 로그인 화면 공지 띠를 읽는다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await verify('공지를 켜 두면 로그인하지 않은 로그인 화면 공지 띠에 그 공지 제목이 보인다', (await 화면.공지띠글기다리기(제목)).includes(제목), true);
  });
});
