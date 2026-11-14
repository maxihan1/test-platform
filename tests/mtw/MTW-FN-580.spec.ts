import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-580',
  name: 'hana_photo 프로필을 열면 팔로워 · 게시물 수와 가입일이 계정 API 값과 같다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 계정 API 를 부르고 프로필을 연다', async () => {
    const 계정 = await 계정찾기API(page, 'hana_photo');
    await 프로필.열기('hana_photo');
    await 프로필.통계('가입').waitFor();
    const 가입일 = new Date(계정.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const 팔로워 = await verify('프로필 팔로워 수가 계정 API 값과 같다', await 프로필.통계숫자('팔로워'), String(계정.followers_count));
    const 게시물 = await verify('프로필 게시물 수가 계정 API 값과 같다', await 프로필.통계숫자('게시물'), String(계정.statuses_count));
    const 가입 = await verify('프로필 가입일이 계정 API 값과 같다', await 프로필.가입일(), 가입일);
    await verify('hana_photo 프로필을 열면 팔로워 · 게시물 수와 가입일이 계정 API 값과 같다', 팔로워 && 게시물 && 가입, true);
  });
});
