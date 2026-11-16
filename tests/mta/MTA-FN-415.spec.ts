import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import {
  머리해시태그지우기,
  소개해시태그화면열기,
  하위화면으로돌아오기,
  해시태그더하기,
  해시태그수맞추기,
  해시태그정리,
  해시태그화면제목,
} from './helpers/profile-edit-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-415',
  name: '소개 해시태그가 10개일 때 하나를 더하면 11번째가 더해지지 않는다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['경계값 분석'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    안쪽개수: z.number().int().min(1).describe('하나를 더하기 전 소개 해시태그 수(경계 안쪽)').default(9),
    바깥개수: z.number().int().min(1).describe('하나를 더하기 전 소개 해시태그 수(경계 바깥)').default(10),
    열째태그: z.string().min(1).describe('열 번째로 더할 해시태그 — tcfeat 로 시작하고 열한째와 달라야 한다').default('tcfeat10'),
    열한째태그: z.string().min(1).describe('열한 번째로 더할 해시태그 — tcfeat 로 시작하고 열째와 달라야 한다').default('tcfeat11'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 더한태그: string[] = [];

  await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내 프로필에서 「프로필 편집」을 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.동작누르기();
    await verify('프로필 편집 화면이 그려진다', await 편집.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('프로필 편집에서 「Featured hashtags」를 연다', async () => {
      await verify('「Featured hashtags」 화면이 열린다', await 소개해시태그화면열기(driver), true, { blocker: true });
      await 머리해시태그지우기(driver);
    });

    await test.step('소개 해시태그를 9개로 맞추고 하나를 더한다', async () => {
      await verify('소개 해시태그를 9개로 맞출 수 있다', await 해시태그수맞추기(driver, params.안쪽개수, 더한태그), true, { blocker: true });
      더한태그.push(params.열째태그);
      await verify('10번째 해시태그가 보인다', await 해시태그더하기(driver, params.열째태그), true);
    });

    await test.step('소개 해시태그를 10개로 맞추고 하나를 더한다', async () => {
      await verify('소개 해시태그를 10개로 맞출 수 있다', await 해시태그수맞추기(driver, params.바깥개수, 더한태그), true, { blocker: true });
      더한태그.push(params.열한째태그);
      await 해시태그더하기(driver, params.열한째태그);
      await verify('해시태그 화면으로 돌아온다', await 하위화면으로돌아오기(driver, 해시태그화면제목), true, { blocker: true });
      await verify('소개 해시태그가 10개일 때 하나를 더하면 11번째가 더해지지 않는다', await 보이나(driver, 편집.줄(`#${params.열한째태그}`)), false);
    });
  } finally {
    await 해시태그정리(driver, 더한태그);
  }
});
