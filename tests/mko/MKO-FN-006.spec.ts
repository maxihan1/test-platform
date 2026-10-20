import { defineCase, test, verify } from '@platform/kit';

import { 로그인, 로그인한아이디, 시험회원가입, 탈퇴, type 시험회원 } from './helpers/account.helper.js';
import { 운영툴화면 } from './pages/ops.page.js';

export const spec = defineCase({
  tcId: 'MKO-FN-006',
  name: '일반 회원이 주소 「/ops」를 열면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다', '일반 회원 계정은 이번 실행에서 새로 가입한 계정이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 운영툴 = new 운영툴화면(page);
  let 회원: 시험회원 | null = null;

  try {
    await test.step('시험용 일반 회원으로 가입하고 로그인한다', async () => {
      회원 = await 시험회원가입(request);
      await 로그인(page, 회원);
    });

    await test.step('일반 회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 아이디가 가입한 아이디와 같다', await 로그인한아이디(page), 회원?.loginId, { blocker: true });
    });

    await test.step('주소 「/ops」를 연다', async () => {
      await 운영툴.열기();
      await verify('일반 회원이 주소 「/ops」를 열면 「권한이 없습니다」 화면이 보인다', await 운영툴.권한없음머리글.isVisible(), true);
    });
  } finally {
    if (회원 !== null) await 탈퇴(page, 회원);
  }
});
