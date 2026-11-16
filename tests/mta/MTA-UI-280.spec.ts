import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-280',
  name: '둘러보기 「추천」 탭에 안내 「다른 사용자가 팔로우하는 계정을 기준으로, 이런 계정들도 좋아할 수 있습니다.」와 추천 계정이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 대상 서버에 추천 계정이 없다(폰에서 빈 목록)',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z.string().describe('추천 탭 안내 글').default('다른 사용자가 팔로우하는 계정을 기준으로, 이런 계정들도 좋아할 수 있습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('둘러보기 「추천」 탭을 연다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    await 둘러보기.탭누르기('추천');
    await verify('안내가 보인다', await 뜰때까지(driver, 둘러보기.안내글, 15_000), true, { blocker: true });
    const 안내 = await verify('안내 글이 기대 결과와 같다', await driver.$(둘러보기.안내글).getText(), expected.안내);
    const 계정 = await verify('추천 계정이 보인다', await 뜰때까지(driver, 둘러보기.추천계정줄들, 15_000), true);
    await verify('둘러보기 「추천」 탭에 안내 「다른 사용자가 팔로우하는 계정을 기준으로, 이런 계정들도 좋아할 수 있습니다.」와 추천 계정이 보인다', 안내 && 계정, true);
  });
});
