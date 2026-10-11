import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 응답본문가로채기 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-152',
  name: '로그인한 뒤 로그인 응답 본문과 화면 어디에도 비밀번호 원문이 보이지 않는다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 비밀번호 = params.password ?? '';
  const 가로챔 = await 응답본문가로채기(page.context(), /\/api\/auth\/login/);

  try {
    await 방해막기(page);

    await test.step('로그인 화면에서 로그인하고 로그인 응답과 화면을 확인한다', async () => {
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', 비밀번호);
      await 로그인.누르기();
      await 머리.인사.waitFor();
      const 화면 = await page.content();
      await verify(
        '로그인한 뒤 로그인 응답 본문과 화면 어디에도 비밀번호 원문이 보이지 않는다',
        { 응답에있음: 비밀번호 !== '' && 가로챔.본문().includes(비밀번호), 화면에있음: 비밀번호 !== '' && 화면.includes(비밀번호) },
        { 응답에있음: false, 화면에있음: false },
      );
    });
  } finally {
    await 가로챔.해제();
  }
});
