import { defineCase, test, verify } from '@platform/kit';

import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-026',
  name: '아이디와 이메일이 일치하면 발송 안내가 보이고 일치하지 않으면 일치하는 회원이 없다는 안내가 보인다',
  precondition: ['새로 가입한 회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 비밀번호찾기화면(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;
  const 이메일 = `${아이디}@demo.market`;

  try {
    await test.step('찾기에 쓸 임시 회원을 가입시킨다', async () => {
      const 응답 = await page.request.post('/api/auth/signup', {
        data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: 이메일, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
      });
      await verify('새로 가입한 회원이다', 응답.ok(), true, { blocker: true });
    });

    await test.step('가입한 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 화면.열기();
      await 화면.찾기(아이디, 이메일);
      await 화면.임시비밀번호받기버튼().waitFor();
      await verify('아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다', await 화면.결과문구().innerText(), '가입하신 이메일로 임시 비밀번호를 보냈습니다');
    });

    await test.step('가입한 아이디와 다른 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 화면.찾기(아이디, `x${이메일}`);
      await 화면.임시비밀번호받기버튼().waitFor();
      await verify('아이디와 이메일이 일치하지 않으면 「일치하는 회원 정보가 없습니다」가 보인다', await 화면.결과문구().innerText(), '일치하는 회원 정보가 없습니다');
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
    await page.request.delete('/api/me');
  }
});
