import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-039',
  name: '회원정보 수정에서 비밀번호를 다시 입력하면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 머리 = new 머리글(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('회원정보 수정 화면을 연다', async () => {
      await 화면.열기();
      await 머리.로그아웃버튼().waitFor();
      await 화면.재확인비밀번호칸().waitFor();
      await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
      await verify(
        '회원정보 수정에 들어가면 먼저 비밀번호를 다시 입력하라는 칸이 보인다',
        [await 화면.재확인안내().isVisible(), await 화면.재확인비밀번호칸().isVisible()],
        [true, true],
      );
    });

    await test.step('회원정보 수정 화면에서 맞는 비밀번호를 다시 입력한다', async () => {
      await 화면.비밀번호재확인하기(비밀번호);
      await 화면.저장버튼().waitFor();
      await verify(
        '비밀번호가 맞으면 이름 · 이메일 · 휴대폰 · 관심 분야를 고칠 수 있다',
        [
          await 화면.이름칸().isEditable(),
          await 화면.이메일칸().isEditable(),
          await 화면.휴대폰칸().isEditable(),
          await 화면.관심분야체크('패션').isEnabled(),
          await 화면.관심분야체크('전자기기').isEnabled(),
          await 화면.관심분야체크('도서').isEnabled(),
          await 화면.관심분야체크('식품').isEnabled(),
        ],
        [true, true, true, true, true, true, true],
      );
      await verify('아이디 칸은 고칠 수 없게 흐리게 보인다', await 화면.아이디칸().isDisabled(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
