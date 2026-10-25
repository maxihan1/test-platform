import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-066',
  name: '없는 아이디로 로그인하면 입력칸 아래에 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: z.object({
    없는아이디: z.string().describe('가입되지 않은 아이디 — 어느 회원도 쓰지 않는 글자').default('dma-nouser-1025'),
    비밀글자: z.string().describe('비밀번호 칸에 적을 글자 — 빈 칸이 아닌 아무 글자').default('dma-probe'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('없는 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인하기(params.없는아이디, params.비밀글자);
    await verify(
      '없는 아이디로 로그인하면 입력칸 아래에 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
      await 로그인.안내글(),
      '아이디 또는 비밀번호가 올바르지 않습니다',
    );
  }, { capture: true });
});
