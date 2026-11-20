import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색뗀글 } from './components/hud.component.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-414',
  name: '로그인 화면 공지 띠 글을 읽으면 공지 띠 글은 「[공지] <제목> — <본문>」 꼴이다',
  platforms: ['android'],
  precondition: ['제목과 본문을 정한 [QA] 공지가 켜져 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    제목: z.string().min(1).describe('공지 제목 — [QA] 로 시작하는 글').default('[QA] 공지 제목'),
    본문: z.string().min(1).describe('공지 본문 — 한 줄 글').default('공지 본문'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  let 화면: 로그인화면 | null = null;
  await test.step('공지를 켜고 로그인 화면을 연다', async () => {
    await 공지만들기(admin, params.제목, params.본문);
    await 게임다시켜기(game, driver);
    화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('로그인 화면 공지 띠 글을 읽는다', async () => {
    await 화면?.공지띠뜸(30_000);
    const 글 = 색뗀글((await 화면?.공지띠글()) ?? '');
    await verify('로그인 화면 공지 띠 글을 읽으면 공지 띠 글은 「[공지] <제목> — <본문>」 꼴이다', 글, `[공지] ${params.제목} — ${params.본문}`);
  });
});
