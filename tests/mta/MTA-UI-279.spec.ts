import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-279',
  name: '둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 링크 카드가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 대상 서버에 유행 링크 카드가 없다(폰에서 빈 목록)',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z.string().describe('소식 탭 안내 글').default('당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('둘러보기 「소식」 탭을 연다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    await 둘러보기.탭누르기('소식');
    await verify('안내가 보인다', await 뜰때까지(driver, 둘러보기.안내글, 15_000), true, { blocker: true });
    const 안내 = await verify('안내 글이 기대 결과와 같다', await driver.$(둘러보기.안내글).getText(), expected.안내);
    const 링크 = await verify('링크 카드가 보인다', await 뜰때까지(driver, 둘러보기.링크카드줄들, 15_000), true);
    await verify('둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 링크 카드가 보인다', 안내 && 링크, true);
  });
});
