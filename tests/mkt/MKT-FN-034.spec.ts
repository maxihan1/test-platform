import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-034',
  name: '가입 조건을 모두 채우면 「가입하기」 버튼이 눌리고 하나라도 빠지면 눌리지 않는다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다', '나머지 필수 항목과 필수 약관을 채워 두었다', '필수 항목을 모두 채웠다'],
  params: z.object({
    name: z.string().min(2).describe('가입 이름').default('마켓회원'),
  }),
  expected: z.object({
    enabled: z.boolean().describe('「가입하기」 버튼이 눌리는지').default(true),
    disabled: z.boolean().describe('「가입하기」 버튼이 눌리는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 회원가입화면(page);
  const 아이디 = `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
  const 값 = { 아이디, 비밀번호: 'Mkt!2026pw', 이름: params.name, 이메일: `${아이디}@example.com` };

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('필수 항목을 모두 채우고 필수 약관 둘에 동의한다', async () => {
    await 화면.필수입력을채운다(값);
    await 화면.중복확인을한다();
    await 화면.필수약관에동의한다();
    await verify('필수 항목이 모두 채워지고 필수 약관 둘에 동의하면 「가입하기」 버튼이 눌린다', await 화면.가입버튼.isEnabled(), expected.enabled, { blocker: true });
  });

  await test.step('필수 약관 하나만 동의한다', async () => {
    await 화면.개인정보.uncheck();
    await verify('필수 약관 하나만 동의하면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입버튼.isEnabled(), expected.disabled);
  });

  await test.step('중복 확인을 한 뒤 아이디를 고치고 「가입하기」를 확인한다', async () => {
    await 화면.개인정보.check();
    await 화면.아이디.fill(`${아이디}x`);
    await verify('중복 확인 뒤 아이디를 고치면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입버튼.isEnabled(), expected.disabled);
  });

  await test.step('중복 확인을 하지 않고 「가입하기」를 확인한다', async () => {
    await verify('중복 확인을 하지 않으면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입버튼.isEnabled(), expected.disabled);
  });
});
