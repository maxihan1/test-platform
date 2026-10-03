import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인부품 } from './components/login.component.js';
import { 홈부품 } from './components/home.component.js';

export const spec = defineCase({
  tcId: 'CDY-FN-001',
  name: '맞는 이메일과 비밀번호로 「로그인」을 누르면 홈에 「Journey Start!」가 보인다',
  platforms: ['desktop'],
  precondition: ['로그인할 수 있는 테스트 계정이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 이메일').optional().meta({ secret: true }),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인부품(page);
  const 홈 = new 홈부품(page);

  await test.step('로그인 화면에서 테스트 계정을 적는다', async () => {
    await 로그인.열기();
    await 로그인.계정적기(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 화면에 테스트 계정이 적힌 것을 확인한다', async () => {
    const 이메일적힘 = (await 로그인.이메일칸.inputValue()) !== '';
    const 비밀번호적힘 = (await 로그인.비밀번호칸.inputValue()) !== '';
    await verify(
      '로그인 화면의 이메일 입력칸과 비밀번호 입력칸에 값이 적혀 있다',
      이메일적힘 && 비밀번호적힘,
      true,
      { blocker: true },
    );
  });

  await test.step('로그인 화면에서 「로그인」을 누른다', async () => {
    await 로그인.로그인버튼.click();

    const 홈보임 = await 홈.여정시작
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(() => true, () => false);
    await verify('맞는 이메일과 비밀번호로 「로그인」을 누르면 홈에 「Journey Start!」가 보인다', 홈보임, true);
  });
});
