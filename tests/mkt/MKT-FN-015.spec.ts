import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-015',
  name: '아이디 중복 확인 결과가 문구로 보이고 확인하지 않은 아이디로는 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['비회원이다', '다른 필수 항목을 모두 채우고 필수 약관에 동의했다', '아이디 중복 확인을 마쳤다'],
  params: z.object({
    loginId: z.string().min(1).describe('이미 있는 아이디').default('user1'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 회원가입화면(page);
  const 새아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;

  await test.step('다른 필수 항목을 모두 채우고 필수 약관에 동의한다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.필수항목채우기(새아이디, 비밀번호, '임시회원', `${새아이디}@demo.market`);
    await 화면.필수약관동의하기();
    await verify(
      '필수 약관 둘에 동의했다',
      [await 화면.약관체크('(필수) 이용약관 동의').isChecked(), await 화면.약관체크('(필수) 개인정보 수집 동의').isChecked()],
      [true, true],
      { blocker: true },
    );
  });

  await test.step('아이디 중복 확인을 하지 않고 「가입하기」 상태를 본다', async () => {
    await verify('중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
  });

  await test.step('이미 있는 아이디 「user1」을 적고 「중복 확인」을 누른다', async () => {
    await 화면.아이디적기(params.loginId);
    await 화면.중복확인하기();
    await 화면.중복확인버튼().waitFor();
    await verify('이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다', await 화면.입력안내('이미 사용 중인 아이디입니다').isVisible(), true);
  });

  await test.step('없는 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 화면.아이디적기(새아이디);
    await 화면.중복확인하기();
    await 화면.중복확인버튼().waitFor();
    await verify('없는 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다', await 화면.입력안내('사용 가능한 아이디입니다').isVisible(), true);
    await verify('중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼().isEnabled(), true, { blocker: true });
  });

  await test.step('확인한 아이디를 고친다', async () => {
    await 화면.아이디적기(`${새아이디}x`);
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
  });
});
