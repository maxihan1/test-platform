import { defineCase, test, verify } from '@platform/kit';
import { 로그인요청, 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 비밀번호틀리기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-106',
  name: '잠긴 계정은 맞는 비밀번호로도 로그인되지 않고 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 5번 연속 비밀번호를 틀려 잠겼다'],
  techniques: ['동등 분할', '상태 전이'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 가입시켜 5번 연속 비밀번호를 틀리게 하고 로그인 화면을 연다', async () => {
      준비.회원 = await 새회원만들기(request);
      await 비밀번호틀리기(request, 준비.회원, 5);
      await 방해창막기(page);
      await 로그인.열기();
    });

    await test.step('회원이 잠겼는지 확인한다', async () => {
      await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
      await verify('잠긴 회원은 맞는 비밀번호 요청에도 로그인되지 않는다', (await 로그인요청(request, 준비.회원?.loginId ?? '', 준비.회원?.password ?? '')) === 200, false, { blocker: true });
    });

    await test.step('잠긴 회원으로 맞는 비밀번호로 로그인한다', async () => {
      await 로그인.틀린로그인하기(준비.회원?.loginId ?? '', 준비.회원?.password ?? '');
      await verify('잠긴 계정은 맞는 비밀번호로도 로그인되지 않고 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', await 로그인.오류안내.innerText(), '로그인 5회 실패로 10분간 로그인할 수 없습니다');
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
