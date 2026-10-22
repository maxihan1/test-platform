import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

const 아무비밀번호 = 'mka-wrong-1';

export const spec = defineCase({
  tcId: 'MKA-FN-063',
  name: '가입하지 않은 아이디로 로그인하면 입력칸 아래 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: z.object({
    아이디: z.string().describe('가입하지 않은 아이디 — 회원으로 없는 아이디').default('mka-nouser'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step(
    '가입하지 않은 아이디 「mka-nouser」와 아무 비밀번호를 적고 「로그인」을 누른다',
    async () => {
      await 화면.로그인(params.아이디, 아무비밀번호);
      await verify(
        '가입하지 않은 아이디로 로그인하면 입력칸 아래 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
        await 화면.오류글(),
        '아이디 또는 비밀번호가 올바르지 않습니다',
      );
    },
    { capture: true },
  );
});
