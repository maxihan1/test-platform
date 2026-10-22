import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-063',
  name: '가입하지 않은 아이디로 「로그인」을 누르면 입력칸 아래 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  techniques: ['동등 분할'],
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: z.object({
    없는아이디: z.string().min(1).describe('가입하지 않은 아이디 — 서버에 없는 아이디').default('mka_nouser'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('가입하지 않은 아이디 「mka_nouser」와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.없는아이디, 'abcd1234');
    const 문구 = await verify('「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 로그인.오류글(), '아이디 또는 비밀번호가 올바르지 않습니다');
    const 자리 = await verify('안내가 비밀번호 입력칸 아래에 있다', await 로그인.오류가입력칸아래인가(), true);
    await verify('가입하지 않은 아이디로 「로그인」을 누르면 입력칸 아래 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', 문구 && 자리, true);
  }, { capture: true });
});
