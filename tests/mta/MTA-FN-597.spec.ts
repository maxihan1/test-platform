import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 사진첨부하기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-597',
  name: '사진 4개를 첨부하면 다 붙는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 폰 사진첩의 사진을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진파일: z.string().describe('첨부할 사진 파일 이름 — 같은 사진을 여러 번 붙인다'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('사진 4개를 첨부한다', async () => {
      for (let i = 0; i < 4; i++) await 사진첨부하기(driver, params.사진파일);
      await verify('사진 4개를 첨부하면 다 붙는다', !(await 문구가보이나(driver, '4개의 미디어를 초과해서 첨부할 수 없습니다', 3_000)), true);
    });
    await test.step('사진 5개를 첨부한다', async () => {
      await 사진첨부하기(driver, params.사진파일);
      await verify('사진 5개째에는 토스트 「4개의 미디어를 초과해서 첨부할 수 없습니다」가 보인다', await 문구가보이나(driver, '4개의 미디어를 초과해서 첨부할 수 없습니다'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
