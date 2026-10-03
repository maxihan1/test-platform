import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-023',
  name: '같은 아이디로 5번 연속 틀리면 잠금 안내가 보이고 로그인에 성공하면 틀린 횟수가 0 으로 돌아간다',
  precondition: ['새로 가입한 회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 시각 = Date.now().toString(36);
  const 잠글아이디 = `mk${시각}`.slice(0, 12);
  const 안잠길아이디 = `mb${시각}`.slice(0, 12);
  const 비밀번호 = `Mk!${시각}1`;
  const 틀린비밀번호 = `${비밀번호}x`;
  const 로그인 = (loginId: string, password: string) => page.request.post('/api/auth/login', { data: { loginId, password, remember: false } });
  const 가입 = (loginId: string) =>
    page.request.post('/api/auth/signup', {
      data: { loginId, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${loginId}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
    });

  try {
    await test.step('로그인 시험에 쓸 임시 회원 둘을 가입시킨다', async () => {
      const 응답 = [await 가입(잠글아이디), await 가입(안잠길아이디)];
      await verify('새로 가입한 회원이다', [응답[0]!.ok(), 응답[1]!.ok()], [true, true], { blocker: true });
    });

    await test.step('같은 아이디로 비밀번호를 5번 연속 틀린다', async () => {
      for (let 횟수 = 0; 횟수 < 4; 횟수 += 1) await 로그인(잠글아이디, 틀린비밀번호);
      await 화면.열기();
      await 화면.로그인하기(잠글아이디, 틀린비밀번호);
      await 화면.로그인버튼().waitFor();
      await verify('같은 아이디로 5번 연속 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', await 화면.오류문구().innerText(), '로그인 5회 실패로 10분간 로그인할 수 없습니다');
    });

    await test.step('네 번 틀린 뒤 한 번 맞게 로그인하고 다시 네 번 틀린다', async () => {
      for (let 횟수 = 0; 횟수 < 4; 횟수 += 1) await 로그인(안잠길아이디, 틀린비밀번호);
      const 맞는로그인 = await 로그인(안잠길아이디, 비밀번호);
      for (let 횟수 = 0; 횟수 < 4; 횟수 += 1) await 로그인(안잠길아이디, 틀린비밀번호);
      const 마지막로그인 = await 로그인(안잠길아이디, 비밀번호);
      await verify('로그인에 성공하면 실패 횟수가 0 으로 돌아가 다시 네 번 틀려도 잠기지 않는다', [맞는로그인.ok(), 마지막로그인.ok()], [true, true]);
    });
  } finally {
    await 로그인(안잠길아이디, 비밀번호);
    await page.request.delete('/api/me');
  }
});
