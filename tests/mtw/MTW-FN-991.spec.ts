import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 오른쪽메뉴 } from './components/side-nav.component.js';
import { 네트워크오류화면 } from './pages/network-error.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-991',
  name: '웹 앱이 프로필을 불러오다 연결이 끊기면 「네트워크 오류」가 보인다',
  held: '보류 — 가짜 응답이 화면에 안 먹는다: 계정 조회 연결을 끊어도 프로필이 그대로 그려진다',
  techniques: ['동등 분할'],
  precondition: ['프로필 API 연결 끊김은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 네트워크오류화면(page);
  const 메뉴 = new 오른쪽메뉴(page);
  const 풀것들: 풀기타입[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('프로필 API 연결이 끊긴 채 hana_photo 프로필을 연다', async () => {
      풀것들.push(await 가짜응답(page, /\/api\/v1\/accounts\/lookup\?acct=hana_photo/, { 끊기: true }));
      await 화면.열기('/@hana_photo');
      const 제목 = await 화면.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('웹 앱이 프로필을 불러오다 연결이 끊기면 「네트워크 오류」가 보인다', 제목, true);
      const 다시 = await verify('「다시 시도」가 보인다', await 화면.다시시도.isVisible(), true);
      const 홈으로 = await verify('「홈으로 돌아가기」가 보인다', await 화면.홈으로.isVisible(), true);
      await verify('「다시 시도」 · 「홈으로 돌아가기」가 보인다', 다시 && 홈으로, true);
    });
  } finally {
    for (const 풀기값 of 풀것들) await 풀기값();
  }
});
