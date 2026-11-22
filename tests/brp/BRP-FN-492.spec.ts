import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-492',
  name: '비밀번호 칸을 읽으면 로그인 화면의 빈 비밀번호 칸에 안내 글 「비밀번호」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('비밀번호 칸을 읽는다', async () => {
    await 화면.비밀번호넣기('');
    await verify('비밀번호 칸이 비어 있다', await 화면.비밀번호칸글(), '', { blocker: true });
    await verify('비밀번호 칸을 읽으면 로그인 화면의 빈 비밀번호 칸에 안내 글 「비밀번호」가 보인다', await 화면.비밀번호안내글(), '비밀번호');
  });

  await test.step('비밀번호 칸에 글자를 넣는다', async () => {
    const 넣은글자 = 'Qa1234Zx';
    await 화면.비밀번호넣기(넣은글자);
    const 표시 = await 화면.비밀번호칸글();
    const 보임 = await verify('비밀번호 칸에 무언가 표시된다', 표시.length > 0, true);
    const 가려짐 = await verify('넣은 글자가 그대로 보이지 않는다', 표시.includes(넣은글자), false);
    await verify('비밀번호 칸에 넣은 글자는 가려져 보인다', 보임 && 가려짐, true);
  });
});
