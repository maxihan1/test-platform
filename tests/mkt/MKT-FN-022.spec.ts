import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-022',
  name: '아이디나 비밀번호가 틀리면 같은 안내가 보이고 잠긴 회원은 잠금 안내가 보인다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('잠긴 회원 아이디').default('locked'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 로그인화면(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 없는아이디 = `zz${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;

  try {
    await test.step('로그인 시험에 쓸 임시 회원을 가입시킨다', async () => {
      const 응답 = await page.request.post('/api/auth/signup', {
        data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
      });
      await verify('임시 회원이 가입돼 있다', 응답.ok(), true, { blocker: true });
    });

    await test.step('맞는 아이디에 틀린 비밀번호로 로그인한다', async () => {
      await 화면.열기();
      await 화면.로그인하기(아이디, `${비밀번호}x`);
      await 화면.로그인버튼().waitFor();
      await verify('비밀번호가 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 화면.오류문구().innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('없는 아이디로 로그인한다', async () => {
      await 화면.로그인하기(없는아이디, 비밀번호);
      await 화면.로그인버튼().waitFor();
      await verify('아이디가 틀려도 같은 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 화면.오류문구().innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('잠긴 회원 「locked」로 로그인한다', async () => {
      await 화면.로그인하기(params.loginId, params.password ?? '');
      await 화면.로그인버튼().waitFor();
      await verify('잠긴 회원으로 로그인하면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다', await 화면.오류문구().innerText(), '로그인 5회 실패로 10분간 로그인할 수 없습니다');
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호, remember: false } });
    await page.request.delete('/api/me');
  }
});
