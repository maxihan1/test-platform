import { defineCase, test, verify } from '@platform/kit';

import { 게시글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-022',
  name: '일반 회원의 글쓰기 화면에 분류 선택 상자 · 제목 · 본문 입력칸이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쓰기 = new 게시글쓰기화면(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('글쓰기 화면을 연다', async () => {
      await 쓰기.열기();
      await 쓰기.준비된폼().waitFor();
      await verify(
        '글쓰기 화면에 분류 선택 상자 · 제목 · 본문 입력칸이 보인다',
        [await 쓰기.분류선택().isVisible(), await 쓰기.제목칸().isVisible(), await 쓰기.본문칸().isVisible()],
        [true, true, true],
        { blocker: true },
      );
      await verify(
        '분류 선택 상자에는 「자유」 「질문」 「후기」가 있고 「공지」는 없다',
        [await 쓰기.분류선택지('자유').count(), await 쓰기.분류선택지('질문').count(), await 쓰기.분류선택지('후기').count(), await 쓰기.분류선택지('공지').count()],
        [1, 1, 1, 0],
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
