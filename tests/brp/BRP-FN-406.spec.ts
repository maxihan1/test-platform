import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지올리기, 점검끄기, QA공지모두지우기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-406',
  name: '공지가 켜져 있으면 로그인 화면 위쪽 공지 띠에 공지가 보인다',
  platforms: ['windows'],
  precondition: ['[QA] 공지 하나가 켜져 있다'],
  params: z.object({
    noticeTitle: z.string().describe('올릴 공지 제목 — [QA] 로 시작').default('[QA] 로그인 화면 공지'),
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 제목 = params.noticeTitle;
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
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

  await test.step('로그인 화면 공지 띠를 읽는다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await verify('공지가 켜져 있으면 로그인 화면 위쪽 공지 띠에 공지가 보인다', (await 화면.공지띠글기다리기(제목)).includes(제목), true);
  });

  await test.step('로그인해 로비 공지 띠를 읽는다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await verify('로비 위쪽 공지 띠에도 공지가 보인다', (await new 공통HUD(game).공지띠글기다리기(제목, 80_000)).includes(제목), true);
  });
});
