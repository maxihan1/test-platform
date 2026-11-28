import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정꺼내기, 사람글찾기 } from './helpers/api.helper.js';
import { 글에서버튼누르기, 글쓰기닫고홈으로, 글열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 답장전안내 = defineCase({
  tcId: 'MTA-FN-169',
  name: '팔로잉이 1명 이상인 사람의 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트가 「알겠습니다」 · 「다시 알리지 않습니다」와 함께 먼저 뜬다',
  platforms: ['android'],
  precondition: ['나를 팔로우하지 않고 팔로잉이 1명 이상인 seoyeon_books 의 글이 있다', '나를 팔로우하지 않고 팔로잉이 0명인 cafe_moon 의 글이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('답장 전 안내 시트 제목').default('안녕하세요, 새로운 연결!'),
    확인: z.string().describe('안내 시트의 확인 버튼 글').default('알겠습니다'),
    다시: z.string().describe('안내 시트의 다시 알리지 않는 버튼 글').default('다시 알리지 않습니다'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-017',
  name: '답장 전 안내 시트',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [답장전안내],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  const 상세 = new 글상세화면(driver);

  await test.case(답장전안내, async ({ params, expected }) => {
    const 나 = 계정꺼내기(params.loginId, params.loginPassword);
    const 연결글 = await 사람글찾기(
      나,
      'seoyeon_books',
      (x) => x.reblog === null && x.visibility === 'public' && x.in_reply_to_id === null && x.spoiler_text === '' && x.media_attachments.length === 0,
      '공개 글',
    );
    const 빈연결글 = await 사람글찾기(나, 'cafe_moon', (x) => x.reblog === null && x.visibility === 'public' && x.in_reply_to_id === null && x.spoiler_text === '', '공개 글');
    await test.step('일반 회원으로 홈에 들어가 seoyeon_books 글을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 글열기(driver, 연결글);
    });
    await test.step('seoyeon_books 글의 「답장」을 누른다', async () => {
      await 글에서버튼누르기(driver, 연결글, '답장');
      const 제목 = await verify('「안녕하세요, 새로운 연결!」 시트가 먼저 뜬다', await 상세.안내시트글있나(expected.제목), true);
      const 확인 = await verify('시트에 「알겠습니다」가 보인다', await 상세.안내시트글있나(expected.확인, 3_000), true);
      const 다시 = await verify('시트에 「다시 알리지 않습니다」가 보인다', await 상세.안내시트글있나(expected.다시, 3_000), true);
      await verify(
        '팔로잉이 1명 이상인 사람의 글에 「답장」을 누르면 「안녕하세요, 새로운 연결!」 시트가 「알겠습니다」 · 「다시 알리지 않습니다」와 함께 먼저 뜬다',
        제목 && 확인 && 다시,
        true,
      );
      await 상세.안내시트글누르기(expected.확인);
    });
    await test.step('cafe_moon 글을 연다', async () => {
      await 글쓰기닫고홈으로(driver);
      await 글열기(driver, 빈연결글);
    });
    await test.step('cafe_moon 글의 「답장」을 누른다', async () => {
      await 글에서버튼누르기(driver, 빈연결글, '답장');
      const 열림 = await verify('답장 글쓰기가 열린다', await 작성.새게시물떴나(15_000), true);
      const 시트없음 = await verify('「안녕하세요, 새로운 연결!」 시트가 안 보인다', !(await 상세.안내시트글있나(expected.제목, 1_000)), true);
      await verify('팔로잉이 0명인 사람의 글에는 「안녕하세요, 새로운 연결!」 시트 없이 답장 글쓰기가 열린다', 열림 && 시트없음, true);
    });
  });
});
