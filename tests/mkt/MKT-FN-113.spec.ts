import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-113',
  name: '회원정보 수정의 이름 · 휴대폰 · 관심 분야가 규칙에 맞지 않으면 입력이 막히거나 안내가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D18·D19·D20: 기획서에 없는 입력 규칙이 화면에 있다. 이름 칸은 10자까지만 받고 비우면 안내가 나오며 휴대폰 칸은 숫자만 받고 관심 분야는 3개까지만 고를 수 있다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 회원정보수정화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  const 로그인응답 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('회원정보 수정 화면에서 이름을 11자로 적는다', async () => {
      await 화면.열기();
      await 머리.로그아웃버튼().waitFor();
      await 화면.재확인비밀번호칸().waitFor();
      await verify('회원으로 로그인해 있다', 로그인응답.status(), 200, { blocker: true });
      await 화면.비밀번호재확인하기(비밀번호);
      await 화면.저장버튼().waitFor();
      await 화면.이름칸().fill('가'.repeat(11));
      await verify('이름 칸에는 11자를 적어도 10자까지만 들어간다', (await 화면.이름칸().inputValue()).length, 10);
    });

    await test.step('회원정보 수정 화면에서 이름을 비운 채 「저장」을 누른다', async () => {
      await 화면.이름칸().fill('');
      await 화면.저장버튼().click();
      await 화면.입력안내('이름은 2~10자입니다').waitFor();
      await verify('이름을 비운 채 「저장」을 누르면 「이름은 2~10자입니다」가 보인다', await 화면.입력안내('이름은 2~10자입니다').isVisible(), true);
    });

    await test.step('회원정보 수정 화면의 휴대폰 칸에 숫자와 숫자가 아닌 글자를 섞어 적는다', async () => {
      await 화면.휴대폰천천히적기('0a1b2-3');
      await verify('휴대폰 칸에 숫자가 아닌 글자를 적으면 바로 지워지고 숫자만 남는다', await 화면.휴대폰칸().inputValue(), '0123');
    });

    await test.step('회원정보 수정 화면에서 관심 분야 넷을 차례로 고른다', async () => {
      await 화면.관심분야고르기('패션');
      await 화면.관심분야고르기('전자기기');
      await 화면.관심분야고르기('도서');
      await 화면.관심분야고르기('식품');
      await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').waitFor();
      await verify(
        '관심 분야를 넷째로 고르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다',
        await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').isVisible(),
        true,
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
