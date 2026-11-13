import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 오른쪽아래에있는지 } from './helpers/place.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-302',
  name: '로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: z.object({
    버전글: z.string().describe('버전 표시 글').default('v0.1 · Unity Boss Room 기반'),
  }),
});

test(spec, async ({ game, expected }) => {
  await test.step('로그인 화면을 연다', async () => {
    const 화면 = await 로그인화면까지(game);
    await verify('로그인 화면의 「게임 시작」이 보인다', await 화면.게임시작누를수있는지(), true, { blocker: true });
  });

  await test.step('로그인 화면 오른쪽 아래를 확인한다', async () => {
    const 화면 = 로그인화면.지금(game);
    const 글 = await 화면.버전글();
    const 오른쪽아래 = await 오른쪽아래에있는지(game, 로그인화면.버전);
    await verify('로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다', 글 === expected.버전글 && 오른쪽아래, true);
  });
});
