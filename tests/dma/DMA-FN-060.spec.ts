import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-060',
  name: '아이디나 비밀번호를 비우고 로그인하면 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: z.object({
    아이디: z.string().describe('채워 둘 아이디 — 빈 칸이 아닌 아무 글자').default('dma-probe'),
    비밀글자: z.string().describe('채워 둘 비밀번호 칸 글자 — 빈 칸이 아닌 아무 글자').default('dma-probe'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('아이디를 비우고 비밀번호만 적어 「로그인」을 누른다', async () => {
    await 로그인.비밀번호적기(params.비밀글자);
    await 로그인.로그인누르기();
    await verify(
      '아이디를 비우고 로그인하면 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
      await 로그인.안내글(),
      '아이디와 비밀번호를 입력하세요',
    );
  });

  await test.step('앱을 다시 켜 빈 로그인 화면을 연다', async () => {
    await 다시켜기(driver);
  });

  await test.step('빈 로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('비밀번호를 비우고 아이디만 적어 「로그인」을 누른다', async () => {
    await 로그인.아이디적기(params.아이디);
    await 로그인.로그인누르기();
    await verify(
      '비밀번호를 비우고 로그인하면 입력칸 아래에 「아이디와 비밀번호를 입력하세요」가 보인다',
      await 로그인.안내글(),
      '아이디와 비밀번호를 입력하세요',
    );
  });
});
