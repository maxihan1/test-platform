import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-336',
  name: '내 프로필 메뉴에 「공유」 · 「링크 복사」 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    공유글: z.string().describe('내 프로필 메뉴 항목').default('공유'),
    링크글: z.string().describe('내 프로필 메뉴 항목').default('링크 복사'),
    큐알글: z.string().describe('내 프로필 메뉴 항목').default('View QR code'),
    브라우저글: z.string().describe('내 프로필 메뉴 항목').default('브라우저에서 열기'),
    즐겨찾기글: z.string().describe('내 프로필 메뉴 항목').default('즐겨찾기'),
    보관함글: z.string().describe('내 프로필 메뉴 항목').default('보관함'),
    해시태그글: z.string().describe('내 프로필 메뉴 항목').default('팔로우 중인 해시태그'),
    설정글: z.string().describe('내 프로필 메뉴 항목').default('계정 설정'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴를 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.메뉴열기();
    const 항목1 = await verify('내 프로필 메뉴에 「공유」가 보인다', await 프로필.메뉴.뜰때까지(expected.공유글), true);
    const 항목2 = await verify('내 프로필 메뉴에 「링크 복사」가 보인다', await 프로필.메뉴.뜰때까지(expected.링크글), true);
    const 항목3 = await verify('내 프로필 메뉴에 「View QR code」가 보인다', await 프로필.메뉴.뜰때까지(expected.큐알글), true);
    const 항목4 = await verify('내 프로필 메뉴에 「브라우저에서 열기」가 보인다', await 프로필.메뉴.뜰때까지(expected.브라우저글), true);
    const 항목5 = await verify('내 프로필 메뉴에 「즐겨찾기」가 보인다', await 프로필.메뉴.뜰때까지(expected.즐겨찾기글), true);
    const 항목6 = await verify('내 프로필 메뉴에 「보관함」가 보인다', await 프로필.메뉴.뜰때까지(expected.보관함글), true);
    const 항목7 = await verify('내 프로필 메뉴에 「팔로우 중인 해시태그」가 보인다', await 프로필.메뉴.뜰때까지(expected.해시태그글), true);
    const 항목8 = await verify('내 프로필 메뉴에 「계정 설정」가 보인다', await 프로필.메뉴.뜰때까지(expected.설정글), true);
    await verify('내 프로필 메뉴에 「공유」 · 「링크 복사」 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다', 항목1 && 항목2 && 항목3 && 항목4 && 항목5 && 항목6 && 항목7 && 항목8, true);
  });
});
