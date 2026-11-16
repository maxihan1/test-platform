import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 해시태그관리열기 } from './helpers/hashtag-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그화면 } from './pages/hashtag.page.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-302',
  name: '해시태그 관리에서 줄을 누르면 그 해시태그 타임라인이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '해시태그 「#카페」를 팔로우하고 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    태그: z.string().min(1).describe('누를 줄의 해시태그 — 샵 기호 없는 낱말, 이 회원이 팔로우 중인 것').default('카페'),
  }),
  expected: z.object({
    제목글: z.string().describe('열린 해시태그 타임라인 제목').default('#카페'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 해시태그관리화면(driver);
  const 화면 = new 해시태그화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('해시태그 관리 화면을 연다', async () => {
    await verify('해시태그 관리 화면에 줄이 그려진다', await 해시태그관리열기(driver), true, { blocker: true });
  });

  await test.step('해시태그 관리에서 「#카페」 줄을 누른다', async () => {
    await 관리.줄누르기(params.태그);
    const 열림 = await verify('해시태그 타임라인이 열린다', await 화면.그려질때까지(), true);
    const 제목 = await verify('열린 타임라인 제목이 「#카페」다', 열림 ? await 화면.제목글() : '', expected.제목글);
    await verify('해시태그 관리에서 줄을 누르면 그 해시태그 타임라인이 열린다', 열림 && 제목, true);
  });
});
