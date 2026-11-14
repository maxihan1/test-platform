import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-969',
  name: '알림 응답이 500 이면 알림 화면이 깨지지 않고 오류 안내가 보인다',
  precondition: ['알림 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 알림 = new 알림머리말화면(page);
  const 풀기들: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  try {
    await test.step('알림 응답을 500 으로 바꾸고 알림 화면을 연다', async () => {
      풀기들.push(await 가짜응답(page, /\/api\/v[12]\/notifications(\?|$)/, { 상태: 500, 본문: { error: '서버 오류' } }));
      await 알림.열기();
      const 안내 = await 알림.알림.모두.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 화면 = await verify('알림 화면 제목이 그대로 보인다', await 알림.제목.isVisible(), true);
      const 오류 = await verify('알림 막대에 오류 안내가 뜬다', 안내, true);
      await verify('알림 응답이 500 이면 알림 화면이 깨지지 않고 오류 안내가 보인다', 화면 && 오류, true);
    });
  } finally {
    for (const 풀 of 풀기들) await 풀();
  }
});
