import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 열린글지우기 } from './helpers/board.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 경로 } from './helpers/view.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-415',
  name: '제목을 비우고 「등록」을 누르면 「제목은 2~50자입니다」가 보인다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 열린글쓰기 = async (): Promise<void> => {
    await 쓰기.열기();
    await 쓰기.제목칸.waitFor();
    await 머리.로그아웃.or(머리.로그인).first().waitFor();
  };

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('로그인한 채 글쓰기 화면이 열리는지 확인한다', async () => {
    await 열린글쓰기();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면이 열려 있다', 경로(page), 글쓰기화면.주소, { blocker: true });
  });

  await test.step('글쓰기 제목을 비우고 분류와 본문만 채워 「등록」을 누른다', async () => {
    try {
      await 쓰기.채우기({ 분류: '자유', 본문: '본문은 열 글자를 넘기는 문장입니다' });
      await 쓰기.등록하고응답받기();
      await 쓰기.알림.filter({ hasText: /\S/ }).first().waitFor();
      await verify('제목을 비우고 「등록」을 누르면 「제목은 2~50자입니다」가 보인다', await 쓰기.알림글('제목은 2~50자입니다').isVisible(), true);
    } finally {
      await 열린글지우기(page);
    }
  });
});
