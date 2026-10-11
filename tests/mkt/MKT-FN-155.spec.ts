import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 등록뒤글번호 } from './helpers/board.helper.js';
import { 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-155',
  name: '분류를 고르지 않고 「등록」 을 누르면 토스트 「분류를 선택하세요」 가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 본문 = '오류 문구를 보려고 적은 본문입니다.';
  const 만든글들: number[] = [];

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('분류만 고르지 않고 제목과 본문을 채워 「등록」 을 누른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.채우기({ 제목: 고유제목(spec.tcId, '분류 없음'), 본문 });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await 알림.모두.first().waitFor();
      await verify('분류를 고르지 않고 「등록」 을 누르면 토스트 「분류를 선택하세요」 가 보인다', await 알림.모두.allInnerTexts(), ['분류를 선택하세요']);
    });

    await test.step('제목을 1자로 적어 「등록」 을 누른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.채우기({ 분류: '자유', 제목: '가', 본문 });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await 알림.모두.first().waitFor();
      await verify('제목을 1자로 적어 「등록」 을 누르면 토스트 「제목은 2~50자입니다」 가 보인다', await 알림.모두.allInnerTexts(), ['제목은 2~50자입니다']);
    });

    await test.step('본문을 9자로 적어 「등록」 을 누른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.채우기({ 분류: '자유', 제목: 고유제목(spec.tcId, '본문 9자'), 본문: '가나다라마바사아자' });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await 알림.모두.first().waitFor();
      await verify('본문을 9자로 적어 「등록」 을 누르면 토스트 「본문은 10~2000자입니다」 가 보인다', await 알림.모두.allInnerTexts(), ['본문은 10~2000자입니다']);
    });
  } finally {
    for (const 번호 of 만든글들) await 글지우기(page.request, 번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
