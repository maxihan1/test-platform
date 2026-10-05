import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면효과 } from './components/site-extra.component.js';
import { 모달, 토스트 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/common-board.page.js';
import { 회원가입화면 } from './pages/common-signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-037',
  name: '약관 「보기」를 누르면 약관 모달이 0.3초 동안 서서히 나타난다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().describe('검색어').default('a'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);
  const 게시판 = new 게시판목록화면(page);
  const 약관모달 = new 모달(page);
  const 토스트창 = new 토스트(page);
  const 효과 = new 화면효과(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 안내창끄기(page);
    await 가입.열기();
    await verify('비회원이다', await 게시판.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 화면에서 이용약관 「보기」를 누른다', async () => {
    await 가입.이용약관보기버튼.click();
    await 약관모달.열림기다리기();
    await verify('약관 「보기」를 누르면 약관 모달이 0.3초 동안 서서히 나타난다', await 효과.모달전환(), { 속성: 'opacity', 시간: '0.3s' });
  });

  await test.step('약관 모달의 「확인」을 누른다', async () => {
    const 전환 = await 효과.모달전환();
    await 약관모달.버튼('확인').click();
    await 약관모달.닫힘기다리기();
    await verify('약관 모달이 0.3초 동안 서서히 사라진다', { ...전환, 사라짐: (await 약관모달.창.count()) === 0 }, { 속성: 'opacity', 시간: '0.3s', 사라짐: true });
  });

  await test.step('게시판 목록 화면을 연다', async () => {
    await 게시판.열기();
  });

  await test.step('게시판 목록에서 검색어 「a」로 검색한다', async () => {
    await 게시판.검색하기(params.검색어);
    await 토스트창.전부.first().waitFor();
    await verify('토스트가 아래에서 밀려 올라온다', await 효과.토스트가아래에서올라오나(), { 시간: '0.3s', 아래에서: true });
  });
});
