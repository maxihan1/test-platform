import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 뮤트차단시트 } from './pages/mute-block-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-364',
  name: '「사용자를 뮤트할까요?」 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」와 「뮤트」 · 「취소」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목글: z.string().describe('뮤트 확인 시트 제목').default('사용자를 뮤트할까요?'),
    안내글: z.string().describe('뮤트 확인 시트 안내').default('해당 사용자는 뮤트되었다는 사실을 모를 것입니다.'),
    뮤트글: z.string().describe('뮤트 확인 시트 단추 글').default('뮤트'),
    취소글: z.string().describe('뮤트 확인 시트 단추 글').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 시트 = new 뮤트차단시트(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('cafe_moon 프로필 메뉴에서 「Mute account」를 누른다', async () => {
    await 프로필열기(driver, 'cafe_moon');
    await 프로필.메뉴열기();
    await 프로필.메뉴항목누르기('Mute account');
    const 제목 = await verify('뮤트 확인 시트에 「사용자를 뮤트할까요?」가 보인다', await 시트.뜰때까지(expected.제목글), true);
    const 안내 = await verify('뮤트 확인 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」가 보인다', await 시트.뜰때까지(expected.안내글), true);
    const 뮤트 = await verify('뮤트 확인 시트에 「뮤트」 단추가 보인다', await 뜰때까지(driver, 시트.단추(expected.뮤트글), 10_000), true);
    const 취소 = await verify('뮤트 확인 시트에 「취소」 단추가 보인다', await 뜰때까지(driver, 시트.단추(expected.취소글), 10_000), true);
    await verify('「사용자를 뮤트할까요?」 시트에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」와 「뮤트」 · 「취소」가 보인다', 제목 && 안내 && 뮤트 && 취소, true);
    await 시트.단추누르기(expected.취소글);
  });
});
