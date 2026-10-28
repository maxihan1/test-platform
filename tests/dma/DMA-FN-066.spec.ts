import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-066',
  name: '없는 아이디로 로그인하면 입력칸 아래에 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  params: z.object({
    unknownId: z.string().describe('없는 아이디 — 가입돼 있지 않은 아이디').default('nouser'),
    wrongPass: z.string().describe('틀린 비밀번호 — 아무 글자').default('wrong1234'),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  let 첫오류자리 = 0;

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('없는 아이디와 아무 비밀번호로 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.unknownId, params.wrongPass);
    const 문구 = await verify(
      '「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
      await 로그인.오류글읽기(),
      '아이디 또는 비밀번호가 올바르지 않습니다',
    );
    const 아래 = await verify('그 글이 입력칸 아래에 있다', await 로그인.오류글이입력칸아래인가(), true);
    첫오류자리 = (await 로그인.오류글.getLocation()).y;
    await verify('없는 아이디로 로그인하면 입력칸 아래에 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', 문구 && 아래, true);
  }, { capture: true });

  await test.step('로그인 화면을 다시 연다', async () => {
    await 앱다시켜기(driver);
    await 로그인.열릴때까지().catch(() => undefined);
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.보이나(), true, { blocker: true });
  });

  await test.step('「user2」와 틀린 비밀번호로 「로그인」을 누른다', async () => {
    await 로그인.로그인('user2', params.wrongPass);
    const 문구 = await verify(
      '「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
      await 로그인.오류글읽기(),
      '아이디 또는 비밀번호가 올바르지 않습니다',
    );
    const 아래 = await verify('그 글이 입력칸 아래에 있다', await 로그인.오류글이입력칸아래인가(), true);
    const 같은자리 = await verify('그 글이 없는 아이디일 때와 같은 자리에 있다', (await 로그인.오류글.getLocation()).y, 첫오류자리);
    await verify(
      '비밀번호가 틀리면 입력칸 아래 같은 자리에 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
      문구 && 아래 && 같은자리,
      true,
    );
  }, { capture: true });
});
