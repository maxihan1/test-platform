import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디, 시험회원가입, 탈퇴, type 시험회원 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 운영툴화면 } from './pages/ops.page.js';

export const spec = defineCase({
  tcId: 'MKO-FN-010',
  name: '로그인 화면에서 로그인하면 주소 「/ops」로 돌아온다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
    '일반 회원 계정은 이번 실행에서 새로 가입한 계정이다',
    '관리자 계정이 대상 서버 설정에 없어 일반 회원으로 로그인한다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 운영툴 = new 운영툴화면(page);
  const 로그인 = new 로그인화면(page);
  let 회원: 시험회원 | null = null;

  try {
    await test.step('시험용 일반 회원으로 가입한다', async () => {
      회원 = await 시험회원가입(request);
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 계정이 없다', await 로그인한아이디(page), null, { blocker: true });
    });

    await test.step('주소 「/ops」를 열어 로그인 화면으로 간 뒤 일반 회원 아이디와 비밀번호로 로그인한다', async () => {
      if (회원 === null) throw new Error('시험 회원이 없다');
      await 운영툴.열기();
      await 로그인.머리글.waitFor();
      await 로그인.로그인(회원.loginId, 회원.password);
      await 로그인.머리글.waitFor({ state: 'detached' });
      await page.waitForLoadState('load');
      await verify('로그인 화면에서 로그인하면 주소 「/ops」로 돌아온다', new URL(page.url()).pathname, 운영툴화면.주소);
    });
  } finally {
    if (회원 !== null) await 탈퇴(page, 회원);
  }
});
