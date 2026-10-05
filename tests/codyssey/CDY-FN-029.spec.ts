import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인상자 } from './components/login.component.js';
import { 내정보화면 } from './pages/my-info.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-029',
  name: '「비밀번호 변경」을 누르면 팝업에 「길이: 8자 이상 20자 이하」 규칙이 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 이메일').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인상자(page);
  const 내정보 = new 내정보화면(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await 로그인.로그인한다(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인됐는지 확인한다', async () => {
    await 로그인.로그인뒤표시.waitFor();
    await verify('로그인 뒤 홈 화면에 「Journey Start!」가 보인다', await 로그인.로그인뒤표시.isVisible(), true, { blocker: true });
  });

  await test.step('내 정보 화면을 연다', async () => {
    await 내정보.연다();
  });

  await test.step('내 정보 화면이 열렸는지 확인한다', async () => {
    await 내정보.내정보변경버튼.waitFor();
    await verify('내 정보 화면에 「내 정보」 제목이 보인다', await 내정보.제목.isVisible(), true, { blocker: true });
  });

  await test.step('내 정보 화면에서 「비밀번호 변경」을 누른다', async () => {
    await 내정보.비밀번호변경팝업을연다();
    await 내정보.비밀번호변경팝업제목.waitFor();
    await verify('「비밀번호 변경」을 누르면 팝업에 「길이: 8자 이상 20자 이하」 규칙이 보인다', await 내정보.비밀번호규칙.isVisible(), true);
  });
});
