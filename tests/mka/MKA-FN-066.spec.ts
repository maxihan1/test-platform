import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아래에있나 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-066',
  name: '잠긴 계정으로 로그인하면 같은 자리에 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['「locked」 회원은 잠겨 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    잠긴아이디: z.string().describe('잠긴 회원 아이디 — 로그인이 막힌 회원').default('locked'),
    아무비밀번호: z.string().describe('비밀번호 — 아무 글자').default('any-pass-1'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('「locked」로 로그인한다', async () => {
    await 로그인.로그인(params.잠긴아이디, params.아무비밀번호);
    const 글 = await verify(
      '「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
      await 로그인.오류글(),
      '로그인 5회 실패로 10분간 로그인할 수 없습니다',
    );
    const 아래 = await verify('안내가 입력칸 아래에 있다', await 아래에있나(로그인.비밀번호칸, 로그인.오류), true);
    await verify('잠긴 계정으로 로그인하면 같은 자리에 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', 글 && 아래, true);
  });
});
