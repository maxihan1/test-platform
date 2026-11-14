import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-993',
  name: '개인 메모 저장 응답이 실패하면 「메모를 저장할 수 없습니다」가 보인다',
  precondition: ['개인 메모 저장 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 풀기: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 프로필.버튼그려질때까지();
    await verify('프로필 「⋯」 버튼이 보인다', await 프로필.더보기.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 개인 메모를 고쳐 저장한다', async () => {
      풀기 = await 가짜응답(page, /\/api\/v1\/accounts\/\d+\/note$/, { 상태: 500, 본문: { error: '서버 오류' } });
      await 프로필.메모열기();
      await 프로필.메모칸.fill(표식('memo'));
      await 프로필.메모저장누르기();
      const 보인다 = await 프로필.안내글('메모를 저장할 수 없습니다').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('개인 메모 저장 응답이 실패하면 「메모를 저장할 수 없습니다」가 보인다', 보인다, true);
    });
  } finally {
    if (풀기 !== undefined) await 풀기();
  }
});
