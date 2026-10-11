import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 클립보드준비 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-154',
  name: '「링크 복사」 를 누르면 클립보드에 그 글 주소가 들어간다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다', '클립보드는 가짜 클립보드(모킹)다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 제목 = 고유제목(spec.tcId, '링크 복사');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 클립보드준비(page.context());
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await verify('게시글 상세 제목이 방금 만든 글의 제목이다', await 상세.제목.innerText(), 제목, { blocker: true });
    });

    await test.step('게시글 상세에서 「링크 복사」 를 누른다', async () => {
      await 상세.링크복사버튼.click();
      await 알림.모두.first().waitFor();
      await verify('「링크 복사」 를 누르면 토스트 「링크를 복사했습니다」 가 보인다', await 알림.모두.allInnerTexts(), ['링크를 복사했습니다']);
      await verify('「링크 복사」 를 누르면 클립보드에 그 글 주소가 들어간다', await 상세.클립보드읽기(), new URL(`/board/${글번호}`, page.url()).href);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
