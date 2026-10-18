import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 새회원만들기, 새회원정보, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-103',
  name: '비밀번호가 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 있다', '로그인 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 가입시키고 로그인 화면을 연다', async () => {
      준비.회원 = await 새회원만들기(request);
      await 방해창막기(page);
      await 로그인.열기();
    });

    await test.step('가입한 회원과 로그인 화면이 준비됐는지 확인한다', async () => {
      await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
    });

    await test.step('그 회원 아이디와 틀린 비밀번호로 로그인한다', async () => {
      await 로그인.틀린로그인하기(준비.회원?.loginId ?? '', `${준비.회원?.password ?? ''}x`);
      await verify('비밀번호가 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 로그인.오류안내.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('없는 아이디로 로그인한다', async () => {
      await 로그인.틀린로그인하기(새회원정보().loginId, 새회원정보().password);
      await verify('없는 아이디로 로그인하면 비밀번호가 틀릴 때와 같은 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 로그인.오류안내.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
