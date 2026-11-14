import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 프로필열기 } from './helpers/app.helper.js';
import { 글읽기, 더보기에서항목찾기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-166',
  name: '인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 / 「이 작업은 되돌릴 수 없습니다.」 / 「게시물 삭제」 확인 창이 뜬다',
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
  const 확인 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('jiho_cafe 가 내 글을 인용한 글 더보기에서 인용 제거 항목을 누른다', async () => {
      await 프로필열기(driver, 'jiho_cafe');
      await verify('jiho_cafe 의 인용한 글 더보기에 인용 제거 항목이 보인다', await 더보기에서항목찾기(driver, '<이름>의 게시물에서 나의 게시물을 제거합니다', true), true, { blocker: true });
      await verify('인용 제거 항목을 누른 뒤 확인 창이 뜬다', await 확인.떴나(), true, { blocker: true });
      const 제목 = await verify('확인 창 제목이 「게시물을 삭제하시겠습니까?」다', await 확인.제목글(), '게시물을 삭제하시겠습니까?');
      const 본문글 = await verify('확인 창 본문이 「이 작업은 되돌릴 수 없습니다.」다', await 확인.본문글(), '이 작업은 되돌릴 수 없습니다.');
      const 삭제 = await verify('확인 창에 「게시물 삭제」 버튼이 보인다', await 글읽기(driver, 확인.확인), '게시물 삭제');
      await verify('인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 / 「이 작업은 되돌릴 수 없습니다.」 / 「게시물 삭제」 확인 창이 뜬다', 제목 && 본문글 && 삭제, true);
      await 확인.취소누르기();
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
