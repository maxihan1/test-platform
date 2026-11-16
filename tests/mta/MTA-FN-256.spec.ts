import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 문구가보이나 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-256',
  name: '공개 범위 시트에서 「팔로워」를 고르면 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    팔로워: z.string().describe('고를 공개 범위').default('팔로워'),
    본인만: z.string().describe('잠긴 인용 가능 범위').default('본인만'),
    안내: z.string().describe('잠금 안내 글').default('마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('공개 범위 시트에서 「팔로워」를 고른다', async () => {
    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });

    await 시트.공개고르기(expected.팔로워);
    const 잠김 = await verify('인용 가능 범위가 기대값과 같다', await 시트.인용글(), expected.본인만);
    const 안내 = await verify('잠금 안내가 보인다', await 문구가보이나(driver, expected.안내), true);
    await verify('공개 범위 시트에서 「팔로워」를 고르면 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」가 보인다', 잠김 && 안내, true);
  });
});
