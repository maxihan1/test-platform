import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';
import { 글자 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-098',
  name: '비밀번호를 비우고 「로그인」을 누르면 서버를 부르지 않고 「아이디와 비밀번호를 입력하세요」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['로그인하지 않았다'],
  params: z.object({
    글자수: z.number().int().min(1).max(20).describe('아이디와 비밀번호 글자 수 — 1~20자').default(1),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
  });

  await test.step('아이디만 적고 비밀번호를 비운 채 「로그인」을 누른다', async () => {
    await 로그인.적기('a', '');
    await 로그인.로그인누르기();
    const 문구 = await verify('오류 줄에 「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류뜰때까지(), '아이디와 비밀번호를 입력하세요');
    const 안보냄 = await verify('로그인 요청이 서버로 가지 않는다', 로그인.로그인요청수, 0);
    await verify('비밀번호를 비우고 「로그인」을 누르면 서버를 부르지 않고 「아이디와 비밀번호를 입력하세요」가 보인다', 문구 && 안보냄, true);
  });

  await test.step('없는 아이디와 비밀번호를 한 글자씩 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인하고응답받기(글자(params.글자수, 'a'), 글자(params.글자수, 'b'));
    await verify('두 칸이 다 찬 로그인 요청은 서버로 간다', 로그인.로그인요청수, 1);
  });
});
