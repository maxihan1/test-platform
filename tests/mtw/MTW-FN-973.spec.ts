import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-973',
  name: '팔로우 응답이 한도 초과 오류면 「당신은 7500명의 사람을 넘어서 팔로우 할 수 없습니다」 안내가 보인다',
  precondition: ['팔로우 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 풀기값: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인하고 qa_admin 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('qa_admin');
    await 프로필.버튼그려질때까지();
    await verify('프로필 머리에 「팔로우」 버튼이 보인다', await 프로필.팔로우버튼.innerText(), '팔로우', { blocker: true });
  });

  try {
    await test.step('한도 초과 오류가 오는 팔로우를 누른다', async () => {
      풀기값 = await 가짜응답(page, /\/api\/v1\/accounts\/\d+\/follow$/, { 상태: 422, 본문: { error: '데이터 검증에 실패하였습니다. 당신은 7500명의 사람을 넘어서 팔로우 할 수 없습니다' } });
      await 프로필.팔로우누르기();
      const 보인다 = await 프로필.안내글('당신은 7500명의 사람을 넘어서 팔로우 할 수 없습니다').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('팔로우 응답이 한도 초과 오류면 「당신은 7500명의 사람을 넘어서 팔로우 할 수 없습니다」 안내가 보인다', 보인다, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
  }
});
