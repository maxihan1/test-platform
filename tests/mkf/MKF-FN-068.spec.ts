import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그아웃, 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-068',
  name: '비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인하면 로그인된다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 아이디가 이미 쓰이고 있다', await 아이디쓰이나(page.request, 정보.loginId), true, { blocker: true });
    });

    await test.step('비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      for (let 번째 = 0; 번째 < 4; 번째 += 1) {
        await 로그인.새로열어틀리게로그인하기(정보.loginId, 'Wrong1234!');
      }
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 머리.로그아웃.waitFor();
      await verify('비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인하면 로그인된다', (await 세션아이디(page)) === 정보.loginId, true);
    });

    await test.step('로그아웃해 실패 횟수를 새로 세게 한다', async () => {
      await API로그아웃(page.request);
      await verify('로그아웃해 로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('비밀번호를 5번 연속 틀린다', async () => {
      for (let 번째 = 0; 번째 < 5; 번째 += 1) {
        await 로그인.새로열어틀리게로그인하기(정보.loginId, 'Wrong1234!');
      }
      await verify(
        '비밀번호를 5번 연속 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
        await 보이는글(로그인.오류),
        '로그인 5회 실패로 10분간 로그인할 수 없습니다',
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});
