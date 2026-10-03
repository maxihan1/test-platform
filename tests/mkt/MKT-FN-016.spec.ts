import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '비밀번호 규칙과 확인 칸 불일치 안내가 보이고 눈 모양 버튼으로 비밀번호를 보였다 가릴 수 있다',
  precondition: ['비회원이다', '비밀번호가 글자로 보이는 상태다'],
  params: null,
  expected: null,
  unconfirmed: '기획서와 다름 — 차이 D2: 비밀번호 칸이 20자까지만 받아 21자를 적어도 20자가 되고 안내가 보이지 않는다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 안내 = '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다';

  await test.step('회원가입 화면에서 숫자만 8자인 비밀번호를 적는다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.비밀번호칸().fill('12345678');
    await verify('규칙에 맞지 않는 비밀번호를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 화면.입력안내(안내).isVisible(), true);
  });

  await test.step('회원가입 화면에서 영문 · 숫자 · 특수문자를 담은 7자 비밀번호를 적는다 → 회원가입 화면에서 영문 · 숫자 · 특수문자를 담은 8자 비밀번호를 적는다', async () => {
    await 화면.비밀번호칸().fill('Ab1!xyz');
    await verify('비밀번호가 7자면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다', await 화면.입력안내(안내).isVisible(), true);
    await 화면.비밀번호칸().fill('Ab1!xyz2');
    await verify('비밀번호가 8자면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보이지 않는다', await 화면.입력안내(안내).isVisible(), false);
  });

  await test.step('회원가입 화면에서 영문 · 숫자 · 특수문자를 담은 21자 비밀번호를 적는다', async () => {
    await 화면.비밀번호칸().fill('Ab1!xxxxxxxxxxxxxxxxx');
    await verify(
      '비밀번호를 21자로 적어도 입력칸에는 20자까지만 들어가고 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보이지 않는다',
      [(await 화면.비밀번호칸().inputValue()).length, await 화면.입력안내(안내).isVisible()],
      [20, false],
    );
  });

  await test.step('비밀번호 확인 칸에 비밀번호와 다른 값을 적는다', async () => {
    await 화면.비밀번호칸().fill('Ab1!xyz2');
    await 화면.비밀번호확인칸().fill('Cd2@abcd');
    await verify('비밀번호 확인이 비밀번호와 다르면 「비밀번호가 일치하지 않습니다」가 보인다', await 화면.입력안내('비밀번호가 일치하지 않습니다').isVisible(), true);
  });

  await test.step('비밀번호 칸 오른쪽 눈 모양 버튼을 누른다 → 눈 모양 버튼을 다시 누른다', async () => {
    await 화면.비밀번호보기버튼().click();
    await verify(
      '눈 모양 버튼을 누르면 입력한 비밀번호가 글자로 보인다',
      [await 화면.비밀번호칸().getAttribute('type'), await 화면.비밀번호칸().inputValue()],
      ['text', 'Ab1!xyz2'],
      { blocker: true },
    );
    await 화면.비밀번호보기버튼().click();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 다시 가려진다', await 화면.비밀번호칸().getAttribute('type'), 'password');
  });
});
