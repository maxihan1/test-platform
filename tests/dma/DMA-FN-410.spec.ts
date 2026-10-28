import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-410',
  name: '비밀번호에 공백만 넣으면 빈 칸처럼 막혀 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  params: z.object({
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('아이디를 적고 비밀번호에 공백만 넣어 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.userId, ' ');
    const 문구 = await verify('「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글읽기(), '아이디와 비밀번호를 입력하세요');
    const 아래 = await verify('그 글이 입력칸 아래에 있다', await 로그인.오류글이입력칸아래인가(), true);
    await verify(
      '비밀번호에 공백만 넣으면 빈 칸처럼 막혀 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
      문구 && 아래,
      true,
    );
  }, { capture: true });
});
