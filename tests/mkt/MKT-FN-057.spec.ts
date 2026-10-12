import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-057',
  name: '이름을 1자로 적으면 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['회원가입 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마쳤다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('회원가입 화면에서 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하기(새회원정보());
  });

  await test.step('「가입하기」 버튼이 눌리는 상태인지 확인한다', async () => {
    await verify('다른 칸을 맞게 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('이름 칸에 1자 「김」을 적는다', async () => {
    await 회원가입.적기(회원가입.이름, '김');
    await verify('이름을 1자로 적으면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('이름 칸에 2자 「김데」를 적는다', async () => {
    await 회원가입.적기(회원가입.이름, '김데');
    await verify('이름을 2자로 적으면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true);
  });

  await test.step('이름 칸에 10자를 적는다', async () => {
    await 회원가입.적기(회원가입.이름, '가나다라마바사아자차');
    await verify('이름을 10자로 적으면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true);
  });
});
