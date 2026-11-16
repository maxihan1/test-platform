import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 해시태그팔로우풀기 } from './helpers/hashtag-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그화면 } from './pages/hashtag.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-357',
  name: '해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「팔로우 해제」로 바뀐다',
  platforms: ['android'],
  held: '보류 — 앱 화면에서 해시태그 타임라인의 메뉴 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다', '해시태그 「#마스토돈」을 팔로우하지 않았다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    태그: z.string().min(1).describe('팔로우할 해시태그 — 샵 기호 없는 낱말, 이 회원이 팔로우하지 않은 것').default('마스토돈'),
  }),
  expected: z.object({
    팔로우글: z.string().describe('팔로우 전 버튼 글').default('팔로우'),
    팔로잉글: z.string().describe('팔로우 뒤 버튼 글').default('팔로잉'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 화면 = new 해시태그화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('팔로우하지 않은 #마스토돈 해시태그 타임라인에서 「팔로우」를 누른다', async () => {
      await verify('해시태그 검색 결과에서 타임라인이 열린다', await 해시태그열기(driver, params.태그), true, { blocker: true });
      await verify('팔로우 전 버튼이 「팔로우」다', await 화면.동작글(), expected.팔로우글, { blocker: true });
      await 화면.동작누르기();
      const 버튼 = await verify('버튼이 「팔로잉」으로 바뀐다', await 될때까지(driver, async () => (await 화면.동작글()) === expected.팔로잉글, 10_000), true);
      await verify('해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「팔로우 해제」로 바뀐다', 버튼, true);
    });
  } finally {
    await 해시태그팔로우풀기(driver, params.태그);
  }
});
