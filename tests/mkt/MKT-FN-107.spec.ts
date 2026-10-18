import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 비밀번호틀리기 } from './helpers/board.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-107',
  name: '로그인에 성공하면 실패 횟수가 0으로 돌아가 다시 4번 틀려도 잠기지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 비밀번호를 4번 연속 틀렸다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새 회원을 가입시켜 비밀번호를 4번 연속 틀리게 하고 로그인 화면을 연다', async () => {
      준비.회원 = await 새회원만들기(request);
      await 비밀번호틀리기(request, 준비.회원, 4);
      await 방해창막기(page);
      await 로그인.열기();
    });

    await test.step('가입한 회원과 로그인 화면이 준비됐는지 확인한다', async () => {
      await verify('로그인 화면 제목 「로그인」이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
    });

    await test.step('맞는 비밀번호로 로그인했다가 로그아웃하고 다시 4번 틀린다', async () => {
      await 로그인.로그인하기(준비.회원?.loginId ?? '', 준비.회원?.password ?? '');
      await 로그인.머리글.로그인꼴일때까지();
      await 로그아웃요청(page.request);
      await 로그인.열기();
      for (let 번 = 0; 번 < 4; 번 += 1) await 로그인.틀린로그인하기(준비.회원?.loginId ?? '', `${준비.회원?.password ?? ''}x`);
      await verify('로그인에 성공하면 실패 횟수가 0으로 돌아가 다시 4번 틀려도 잠기지 않는다', await 로그인.오류안내.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});
