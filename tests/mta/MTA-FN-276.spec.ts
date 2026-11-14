import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 글자요소가보이나, 인용누르고확인창찾기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-276',
  name: '제한적 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 / 「조용한 공개 게시물을 인용할 때, 당신의 게시물은 트렌딩 타임라인에서 숨겨질 것입니다.」 / 「무시」 · 「다시 알리지 않습니다」 창이 뜬다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('seoyeon_books 의 조용한 공개 글에서 「인용하기」를 누른다', async () => {
      await 프로필열기(driver, 'seoyeon_books');
      await verify('인용하기를 누른 뒤 확인 창이 뜬다', await 인용누르고확인창찾기(driver, '조용한 공개 게시물 인용하기'), true, { blocker: true });
      const 안내 = await verify('확인 창에 「조용한 공개 게시물을 인용할 때, 당신의 게시물은 트렌딩 타임라인에서 숨겨질 것입니다.」가 보인다', await 문구가보이나(driver, '조용한 공개 게시물을 인용할 때, 당신의 게시물은 트렌딩 타임라인에서 숨겨질 것입니다.'), true);
      const 무시 = await verify('확인 창에 「무시」 버튼이 보인다', await 글자요소가보이나(driver, '무시'), true);
      const 다시 = await verify('확인 창에 「다시 알리지 않습니다」 버튼이 보인다', await 글자요소가보이나(driver, '다시 알리지 않습니다'), true);
      await verify('제한적 공개 글을 인용하러 들어오면 「조용한 공개 게시물 인용하기」 / 「조용한 공개 게시물을 인용할 때, 당신의 게시물은 트렌딩 타임라인에서 숨겨질 것입니다.」 / 「무시」 · 「다시 알리지 않습니다」 창이 뜬다', 안내 && 무시 && 다시, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
