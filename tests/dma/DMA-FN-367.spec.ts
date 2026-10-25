import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-367',
  name: '비밀번호에 공백만 넣고 로그인하면 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  techniques: ['오류 추정'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: z.object({
    없는아이디: z.string().describe('가입되지 않은 아이디 — 어느 회원도 쓰지 않는 글자').default('dma-nouser-1025'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('없는 아이디를 적고 비밀번호에 공백만 넣어 「로그인」을 누른다', async () => {
    await 로그인.로그인하기(params.없는아이디, '   ');
    await verify(
      '비밀번호에 공백만 넣고 로그인하면 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
      await 로그인.안내글(),
      '아이디와 비밀번호를 입력하세요',
    );
  }, { capture: true });
});
