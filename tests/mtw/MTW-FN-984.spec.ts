import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 차단목록화면 } from './pages/blocks.page.js';
import { 도메인차단목록화면 } from './pages/domain-blocks.page.js';
import { 뮤트목록화면 } from './pages/mutes.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-984',
  name: '뮤트한 사람이 없을 때 뮤트 화면을 열면 「아직 아무도 뮤트하지 않았습니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['뮤트 · 차단 · 도메인 차단 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 뮤트 = new 뮤트목록화면(page);
  const 차단 = new 차단목록화면(page);
  const 도메인 = new 도메인차단목록화면(page);
  const 풀것들: 풀기타입[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 뮤트.열기();
    await verify('뮤트 화면에 「뮤트한 사용자」 제목이 보인다', await 뮤트.제목.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('뮤트한 사용자 화면을 연다', async () => {
      풀것들.push(await 가짜응답(page, /\/api\/v1\/mutes/, { 상태: 200, 본문: [] }));
      await 뮤트.열기();
      const 보인다 = await 뮤트.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('뮤트한 사람이 없을 때 뮤트 화면을 열면 「아직 아무도 뮤트하지 않았습니다.」가 보인다', 보인다, true);
    });

    await test.step('차단한 사용자 화면을 연다', async () => {
      풀것들.push(await 가짜응답(page, /\/api\/v1\/blocks/, { 상태: 200, 본문: [] }));
      await 차단.열기();
      const 보인다 = await 차단.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('차단 화면에는 「아직 아무도 차단하지 않았습니다.」가 보인다', 보인다, true);
    });

    await test.step('차단한 도메인 화면을 연다', async () => {
      풀것들.push(await 가짜응답(page, /\/api\/v1\/domain_blocks/, { 상태: 200, 본문: [] }));
      await 도메인.열기();
      const 보인다 = await 도메인.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('차단한 도메인 화면에는 「아직 차단한 도메인이 없습니다.」가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기값 of 풀것들) await 풀기값();
  }
});
