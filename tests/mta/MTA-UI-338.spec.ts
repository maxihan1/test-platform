import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 확인창이면취소하기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 확인창 } from './components/dialog.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-338',
  name: '프로필 편집에서 헤더 · 아바타를 누르면 팝업 「Replace」 · 「제거」가 뜨고 「제거」는 「Remove header image?」 · 「Remove profile picture?」를 묻는다',
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
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 확인 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('프로필 편집에서 헤더 이미지를 누르고 「제거」를 누른다', async () => {
    try {
      await 프로필.내프로필열기();
      await 편집.열기();
      await 편집.이미지누르기('헤더');
      const 헤더항목 = await 편집.팝업항목들();
      await 편집.팝업고르기('제거');
      const 헤더질문 = await 문구가보이나(driver, 'Remove header image?');
      await 확인.취소누르기();
      await 편집.이미지누르기('아바타');
      const 아바타항목 = await 편집.팝업항목들();
      await 편집.팝업고르기('제거');
      const 아바타질문 = await 문구가보이나(driver, 'Remove profile picture?');
      const 판정1 = await verify('헤더 이미지 팝업에 「Replace」가 보인다', 헤더항목.includes('Replace'), true);
      const 판정2 = await verify('헤더 이미지 팝업에 「제거」가 보인다', 헤더항목.includes('제거'), true);
      const 판정3 = await verify('헤더 이미지의 「제거」는 「Remove header image?」를 묻는다', 헤더질문, true);
      const 판정4 = await verify('아바타 팝업에 「Replace」가 보인다', 아바타항목.includes('Replace'), true);
      const 판정5 = await verify('아바타 팝업에 「제거」가 보인다', 아바타항목.includes('제거'), true);
      const 판정6 = await verify('아바타의 「제거」는 「Remove profile picture?」를 묻는다', 아바타질문, true);
      await verify('프로필 편집에서 헤더 · 아바타를 누르면 팝업 「Replace」 · 「제거」가 뜨고 「제거」는 「Remove header image?」 · 「Remove profile picture?」를 묻는다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5 && 판정6, true);
    } finally {
      await 확인창이면취소하기(driver);
    }
  }, { capture: true });
});
