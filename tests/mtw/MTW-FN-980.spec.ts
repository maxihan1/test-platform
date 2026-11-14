import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 팔로우한해시태그화면 } from './pages/followed-tags.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-980',
  name: '팔로우한 해시태그가 없을 때 그 화면을 열면 「아직 아무 해시태그도 팔로우하고 있지 않습니다. 해시태그를 팔로우하면, 여기에 표시됩니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['팔로우한 해시태그 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 화면 = new 팔로우한해시태그화면(page);
  const 풀기목록: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('팔로우한 해시태그가 없을 때 팔로우 중인 해시태그 화면을 연다', async () => {
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/followed_tags/, { 본문: [] }));
      await 화면.열기();
      await verify('팔로우 중인 해시태그 화면이 열려 있다', new URL(page.url()).pathname, '/followed_tags', { blocker: true });
      const 보인다 = await 화면.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('팔로우한 해시태그가 없을 때 그 화면을 열면 「아직 아무 해시태그도 팔로우하고 있지 않습니다. 해시태그를 팔로우하면, 여기에 표시됩니다.」가 보인다', 보인다, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
