import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-298',
  name: '로그인 화면에 창 제목 「로그인」, 안내 글 「아이디」 · 「비밀번호」인 두 칸, 「게임 시작」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['게임을 켜 로그인 화면이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  let 화면 = 로그인화면.지금(game);
  await test.step('로그인 화면을 기다린다', async () => {
    화면 = await 로그인화면.열기(game);
  });
  await test.step('로그인 화면을 확인한다', async () => {
    const 제목 = await verify('창 제목이 「로그인」이다', await 화면.글(로그인화면.제목), '로그인');
    const 아이디칸 = await verify('아이디 칸의 안내 글이 「아이디」다', await 화면.글(로그인화면.아이디안내), '아이디');
    const 비밀번호칸 = await verify('비밀번호 칸의 안내 글이 「비밀번호」다', await 화면.글(로그인화면.비밀번호안내), '비밀번호');
    const 버튼 = await verify('「게임 시작」 버튼이 보인다', await 화면.글(로그인화면.게임시작글), '게임 시작');
    const 배치 = await verify('로그인 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', (await game.layout(로그인화면.창)).problems, []);
    await verify('로그인 화면에 창 제목 「로그인」, 안내 글 「아이디」 · 「비밀번호」인 두 칸, 「게임 시작」 버튼이 보인다', 제목 && 아이디칸 && 비밀번호칸 && 버튼 && 배치, true);
  });
});
