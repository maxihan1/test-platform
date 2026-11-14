import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-018',
  name: '로그인 후 오른쪽 메뉴 둘째 구획에 「리스트」 · 「팔로우 중인 해시태그」 · 「좋아요」 · 「북마크」 · 「컬렉션」 · 「개인 멘션」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    const 리스트 = await verify('오른쪽 메뉴 둘째 구획에 「리스트」가 보인다', await 홈.메뉴.링크('리스트').isVisible(), true);
    const 해시태그 = await verify('오른쪽 메뉴 둘째 구획에 「팔로우 중인 해시태그」가 보인다', await 홈.메뉴.링크('팔로우 중인 해시태그').isVisible(), true);
    const 좋아요 = await verify('오른쪽 메뉴 둘째 구획에 「좋아요」가 보인다', await 홈.메뉴.링크('좋아요').isVisible(), true);
    const 북마크 = await verify('오른쪽 메뉴 둘째 구획에 「북마크」가 보인다', await 홈.메뉴.링크('북마크').isVisible(), true);
    const 컬렉션 = await verify('오른쪽 메뉴 둘째 구획에 「컬렉션」이 보인다', await 홈.메뉴.링크('컬렉션').isVisible(), true);
    const 멘션 = await verify('오른쪽 메뉴 둘째 구획에 「개인 멘션」이 보인다', await 홈.메뉴.링크('개인 멘션').isVisible(), true);
    await verify('로그인 후 오른쪽 메뉴 둘째 구획에 「리스트」 · 「팔로우 중인 해시태그」 · 「좋아요」 · 「북마크」 · 「컬렉션」 · 「개인 멘션」이 보인다', 리스트 && 해시태그 && 좋아요 && 북마크 && 컬렉션 && 멘션, true);
  });
});
