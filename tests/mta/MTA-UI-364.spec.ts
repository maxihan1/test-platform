import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-364',
  name: '사용자 뮤트 확인 시트(「사용자를 뮤트할까요?」)에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」 · 「당신는 해당 사용자를 멘션하는 게시물을 더는 보지 않게 됩니다.」 등과 「뮤트」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 뮤트시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필 메뉴에서 「Mute account」를 누른다', async () => {
    await 시트.메뉴에서고르기('Mute account');
    const 질문 = await verify('확인 시트 「사용자를 뮤트할까요?」가 보인다', await 시트.시트떴나(), true);
    const 첫째 = await verify('「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」가 보인다', await 시트.글보이나('해당 사용자는 뮤트되었다는 사실을 모를 것입니다.'), true);
    const 둘째 = await verify('「당신는 해당 사용자를 멘션하는 게시물을 더는 보지 않게 됩니다.」가 보인다', await 시트.글보이나('당신는 해당 사용자를 멘션하는 게시물을 더는 보지 않게 됩니다.'), true);
    const 실행 = await verify('「뮤트」 단추가 보인다', await 시트.단추보이나('뮤트'), true);
    const 취소 = await verify('「취소」 단추가 보인다', await 시트.단추보이나('취소'), true);
    await verify('사용자 뮤트 확인 시트(「사용자를 뮤트할까요?」)에 「해당 사용자는 뮤트되었다는 사실을 모를 것입니다.」 · 「당신는 해당 사용자를 멘션하는 게시물을 더는 보지 않게 됩니다.」 등과 「뮤트」 · 「취소」가 보인다', 질문 && 첫째 && 둘째 && 실행 && 취소, true);
    await 시트.취소하기();
  }, { capture: true });
});
