import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-029',
  name: '문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 추가된다',
  precondition: ['새로 가입한 회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 문의화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
  const 문의제목 = `문의 ${아이디}`;

  try {
    await test.step('1:1 문의 화면에서 유형 · 제목 · 내용을 채워 문의를 등록한다', async () => {
      await 화면.열기();
      await 화면.내역제목().waitFor();
      await 머리.로그아웃버튼().waitFor();
      await verify('새로 가입한 회원이다', await 머리.이름표시().innerText(), '임시회원님', { blocker: true });
      await 화면.문의등록하기('주문', 문의제목, '주문 상태를 알고 싶습니다');
      await 알림.문구('문의가 등록되었습니다').waitFor();
      const 첫줄 = (await 화면.내역줄글자들())[0] ?? [];
      await verify('문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 추가된다', [첫줄[1], 첫줄[3]], [문의제목, '답변 대기']);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
