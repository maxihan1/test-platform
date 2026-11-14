import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-987',
  name: '정지된 계정 프로필을 열면 「계정 정지됨」이 보인다',
  held: '보류 — 가짜 응답이 화면에 안 먹는다: 계정 조회 응답을 정지로 바꿔도 프로필이 그대로 그려진다',
  precondition: ['계정 응답의 정지 값은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 풀것들: 풀기타입[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('정지된 계정 프로필을 연다', async () => {
      const 계정 = await 계정찾기API(page, 'hana_photo');
      풀것들.push(await 가짜응답(page, /\/api\/v1\/accounts\/lookup\?acct=hana_photo/, { 상태: 200, 본문: { ...계정, suspended: true } }));
      await 프로필.주소만열기('/@hana_photo');
      const 정지 = await 프로필.안내글('계정 정지됨').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('정지된 계정 프로필을 열면 「계정 정지됨」이 보인다', 정지, true);
      await verify('정지된 계정 프로필에는 팔로우 버튼이 없다', await 프로필.팔로우버튼.isVisible(), false);
    });
  } finally {
    for (const 풀기값 of 풀것들) await 풀기값();
  }
});
