import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, API로그인 } from './helpers/account.helper.js';
import { 느린응답걸기, 틀린비밀번호 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-007',
  name: '서버 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop'],
  precondition: [
    '로그인 응답은 1.5초 늦춘 응답이다',
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
  let 해제: (() => Promise<void>) | undefined;

  try {
    await 방해막기(page);
    해제 = await 느린응답걸기(page.context(), /\/api\/auth\/login/, 1500);

    await test.step('로그인 화면에서 아이디와 비밀번호를 넣고 「로그인」 을 누른다', async () => {
      await 로그인.열기();
      await 머리.로그인링크.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await 로그인.입력하기(params.loginId ?? '', params.password ?? '');
      await 로그인.누르기();
      await verify('서버 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
      await verify('서버 응답을 기다리는 동안 「로그인」 버튼 글자 대신 로딩 표시가 보인다', await 로그인.로딩표시.isVisible(), true);
      await 머리.인사.waitFor();
    });

    await test.step('틀린 비밀번호로 「로그인」 을 누르고 응답을 기다린다', async () => {
      await page.context().clearCookies();
      await 로그인.열기();
      await 로그인.입력하기(둘째아이디, 틀린비밀번호);
      await 로그인.누르기();
      await 로그인.오류문구.filter({ hasText: '아이디 또는 비밀번호가 올바르지 않습니다' }).waitFor();
      await verify('로그인 응답이 1.5초 늦게 와도 응답이 오면 「로그인」 버튼이 다시 눌린다', await 로그인.로그인버튼.isEnabled(), true);
    });
  } finally {
    await 해제?.();
    await API로그인(page.request, 둘째아이디, params.password ?? '');
  }
});
