import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-411',
  name: '운영툴에서 공지를 켜면 1분 안에 로그인 화면 공지 띠에 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    제한초: z.number().int().min(1).describe('공지가 보이기까지 허용 시간(초) — 기획서의 1분').default(60),
    오차초: z.number().min(0).describe('시간 재기 오차(초)').default(2),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  let 화면: 로그인화면 | null = null;
  await test.step('로그인 화면을 연다', async () => {
    await 게임다시켜기(game, driver);
    화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await verify('로그인 화면에 공지 띠가 없다', await 화면.공지띠글(), null, { blocker: true });
  });
  await test.step('운영툴에서 [QA] 공지를 켜고 기다린다', async () => {
    const 시작 = Date.now();
    await 공지만들기(admin, '[QA] 공지 411', '공지 띠 1분 시험');
    const 뜸 = (await 화면?.공지띠뜸((params.제한초 + params.오차초) * 1000)) ?? false;
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 보임 = await verify('로그인 화면 공지 띠에 공지가 보인다', 뜸, true);
    const 안 = await verify('공지를 켠 뒤 걸린 시간이 1분 안이다', 걸린초 <= params.제한초 + params.오차초, true);
    await verify('운영툴에서 공지를 켜면 1분 안에 로그인 화면 공지 띠에 보인다', 보임 && 안, true);
  });
});
