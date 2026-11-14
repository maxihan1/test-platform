import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용글쓰기화면 } from './pages/quote-compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-293',
  name: '부스트 시트 「인용하기」를 누르면 글쓰기에 인용 카드가 붙고 내 글도 인용할 수 있다',
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
  const 인용 = new 인용글쓰기화면(driver);
  const 원글 = 테스트글('인용 원글');
  let 올림 = false;
  let 열림 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 내 새 글을 올린다', async () => {
      await 글올리기(driver, 원글);
      올림 = true;
    });

    await test.step('내 새 글의 부스트 시트에서 「인용하기」를 누른다', async () => {
      await 인용.내글부스트시트에서인용하기(원글);
      열림 = true;
      const 카드 = await verify('글쓰기에 인용 카드가 붙는다', await 인용.떴나(), true);
      const 내글 = await verify('인용 카드에 내 글이 들어 있다', await 인용.인용글에글이있나(원글), true);
      await verify('부스트 시트 「인용하기」를 누르면 글쓰기에 인용 카드가 붙고 내 글도 인용할 수 있다', 카드 && 내글, true);
    }, { capture: true });
  } finally {
    if (열림) await 인용.닫기();
    if (올림) await 내글지우기(driver, 원글);
  }
});
