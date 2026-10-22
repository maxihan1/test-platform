import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

const 아무비밀번호 = 'mka-wrong-1';

export const spec = defineCase({
  tcId: 'MKA-FN-060',
  name: '아이디를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: z.object({
    아이디: z.string().describe('비밀번호를 비울 때 적을 아이디 — 빈 칸이 아닌 아무 글자').default('mka-nouser'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step(
    '아이디를 비우고 비밀번호만 적은 뒤 「로그인」을 누른다',
    async () => {
      await 화면.로그인('', 아무비밀번호);
      await verify(
        '아이디를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
        await 화면.오류글(),
        '아이디와 비밀번호를 입력하세요',
      );
    },
    { capture: true },
  );

  await test.step('앱을 다시 켜서 로그인 화면을 연다', async () => {
    await 화면.앱다시켜기();
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step(
    '비밀번호를 비우고 아이디만 적은 뒤 「로그인」을 누른다',
    async () => {
      await 화면.로그인(params.아이디, '');
      await verify(
        '비밀번호를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
        await 화면.오류글(),
        '아이디와 비밀번호를 입력하세요',
      );
    },
    { capture: true },
  );
});
