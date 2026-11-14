import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-183',
  name: '없는 이메일로 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({
    없는이메일: z.string().min(1).describe('가입하지 않은 이메일 — 이 서버에 없는 주소').default('tc-nobody-0@maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 「로그인」 버튼이 보인다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 없는 이메일과 아무 암호를 넣고 「로그인」을 누른다', async () => {
    await 로그인.로그인(params.없는이메일, 'Tc-nobody-9');
    const 떴다 = await 로그인.안내('올바르지 않은 이메일 주소 혹은 암호입니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('없는 이메일로 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」가 보인다', 떴다, true);
  });
});
