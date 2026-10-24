import { defineCase, test, verify } from '@platform/kit';

import { 서버맞추기 } from './helpers/game-enter.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-674',
  name: '로그인 화면에서 아이디와 비밀번호를 비우고 「로그인」을 누르면 상태 글에 「아이디는 4~16자의 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['게임 로그인 화면이 떠 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ game }) => {
  await test.step('게임 로그인 화면을 연다', async () => {
    const 화면 = await 서버맞추기(game);
    await verify('로그인 화면에 서버 주소 글이 보인다', (await 화면.서버글()).startsWith('서버:'), true, { blocker: true });
  });
  await test.step('로그인 화면에서 아이디와 비밀번호를 비우고 「로그인」을 누른다', async () => {
    const 화면 = new 로그인화면(game);
    await 화면.아이디적기('');
    await 화면.비밀번호적기('');
    await 화면.로그인누르기();
    await 화면.상태글뜰때까지('아이디는');
    await verify('로그인 화면에서 아이디와 비밀번호를 비우고 「로그인」을 누르면 상태 글에 「아이디는 4~16자의 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.」가 보인다', await 화면.상태글(), '아이디는 4~16자의 영문 소문자, 숫자, 밑줄만 쓸 수 있습니다.');
  });
});
