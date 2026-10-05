import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인상자 } from './components/login.component.js';
import { 내정보화면 } from './pages/my-info.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-006',
  name: '내 정보 화면에 「내 정보」 제목이 보인다',
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
    await 내정보.내정보변경버튼.waitFor();
    await verify('내 정보 화면에 「내 정보」 제목이 보인다', await 내정보.제목.isVisible(), true);
    await verify('「회원탈퇴」 · 「홈으로」 · 「비밀번호 변경」 · 「내정보 변경하기」 버튼이 보인다', await 내정보.하단버튼들이보이는지(), true);
    await verify('성명 칸이 꺼져 있다', await 내정보.성명칸.isDisabled(), true);
  });
});
