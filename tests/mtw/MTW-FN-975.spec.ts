import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 리스트화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-975',
  name: '리스트가 없을 때 리스트 화면을 열면 「아직 아무 리스트도 없습니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['리스트 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 리스트화면(page);
  let 풀기값: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인하고 리스트 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('리스트 화면에 「리스트」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('리스트가 없을 때 리스트 화면을 연다', async () => {
      풀기값 = await 가짜응답(page, /\/api\/v1\/lists$/, { 상태: 200, 본문: [] });
      await 화면.열기();
      const 안내 = await 화면.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 권유 = await 화면.만들기권유.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('리스트가 없을 때 리스트 화면을 열면 「아직 아무 리스트도 없습니다.」가 보인다', 안내, true);
      await verify('「새 리스트를 만들어 홈 피드를 정리하세요」가 같이 보인다', 권유, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
  }
});
