import { defineCase, test, verify } from '@platform/kit';

import { 지금화면 } from './helpers/game-enter.helper.js';
import { 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인버전글자리, 로그인화면준비 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-499',
  name: '오른쪽 아래 버전 글을 읽으면 로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: null,
  expected: null,
});

test(spec, async ({ game, driver, admin }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 화면 = await 로그인화면준비(game, driver);
  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('오른쪽 아래 버전 글을 읽는다', async () => {
    const 자리 = await 로그인버전글자리(game);
    const 글 = await verify('버전 글이 「v0.1 · Unity Boss Room 기반」이다', await 화면.버전글(), 'v0.1 · Unity Boss Room 기반');
    const 가로 = await verify('버전 글이 화면 오른쪽에 있다', 자리?.가로 === '오른쪽', true);
    const 세로 = await verify('버전 글이 화면 아래에 있다', 자리?.세로 === '아래', true);
    await verify('오른쪽 아래 버전 글을 읽으면 로그인 화면 오른쪽 아래에 「v0.1 · Unity Boss Room 기반」이 보인다', 글 && 가로 && 세로, true);
  });
});
