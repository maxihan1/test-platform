import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { gif이미지, 고유제목, 글머리, 남의시드글, 등록뒤글번호, 작은이미지, 큰이미지 } from './helpers/board.helper.js';
import { 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-063',
  name: '분류를 고르지 않고 등록하면 글이 등록되지 않는다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다', '회원으로 로그인해 있다'],
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
  const 본문 = '등록되지 않는지 보려고 적은 본문입니다.';
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
      await verify('분류를 고르지 않고 등록하면 글이 등록되지 않는다', { 등록됨: 응답.ok(), 주소: new URL(page.url()).pathname }, { 등록됨: false, 주소: '/board/write' });
    });

    await test.step('제목만 비우고 분류와 본문을 채워 「등록」 을 누른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.채우기({ 분류: '자유', 본문 });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await verify('제목을 비우고 등록하면 글이 등록되지 않는다', { 등록됨: 응답.ok(), 주소: new URL(page.url()).pathname }, { 등록됨: false, 주소: '/board/write' });
    });

    await test.step('본문만 비우고 분류와 제목을 채워 「등록」 을 누른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.채우기({ 분류: '자유', 제목: 고유제목(spec.tcId, '본문 없음') });
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await verify('본문을 비우고 등록하면 글이 등록되지 않는다', { 등록됨: 응답.ok(), 주소: new URL(page.url()).pathname }, { 등록됨: false, 주소: '/board/write' });
    });

    await test.step('분류 드롭다운을 연다', async () => {
      await 글쓰기.열기();
      await 글쓰기.분류.focus();
      await verify('일반 회원의 분류 드롭다운에는 「공지」 가 보이지 않는다', await 글쓰기.분류항목들.filter({ hasText: '공지' }).count(), 0);
    });

    await test.step('gif 이미지를 첨부한다', async () => {
      await 글쓰기.열기();
      await 글쓰기.이미지넣기([gif이미지('a.gif')]);
      await 알림.모두.first().waitFor();
      await verify('gif 이미지를 첨부하면 토스트 「jpg, png 파일만 올릴 수 있습니다」 가 보인다', await 알림.모두.allInnerTexts(), ['jpg, png 파일만 올릴 수 있습니다']);
    });

    await test.step('10MB png 이미지를 첨부한다', async () => {
      await 글쓰기.열기();
      await 글쓰기.이미지넣기([큰이미지('big.png', 10 * 1024 * 1024)]);
      await 알림.모두.first().waitFor();
      await verify('10MB 이미지를 첨부하면 토스트 「5MB 이하 파일만 올릴 수 있습니다」 가 보인다', await 알림.모두.allInnerTexts(), ['5MB 이하 파일만 올릴 수 있습니다']);
    });

    await test.step('이미지 다섯 장을 한 번에 고른다', async () => {
      await 글쓰기.열기();
      await 글쓰기.이미지넣기(['a', 'b', 'c', 'd', 'e'].map((이름) => 작은이미지(`${이름}.png`)));
      await 알림.모두.first().waitFor();
      await verify(
        '이미지 다섯 장을 한 번에 고르면 토스트 「이미지는 최대 3장까지 첨부할 수 있습니다」 가 보인다',
        await 알림.모두.allInnerTexts(),
        ['이미지는 최대 3장까지 첨부할 수 있습니다'],
      );
    });

    await test.step('남의 글 수정 주소를 연다', async () => {
      await 글쓰기.수정열기(남의시드글);
      await 글쓰기.권한없음안내.waitFor();
      await verify('남의 글 수정 주소를 열면 「권한이 없습니다」 화면이 보인다', await 글쓰기.권한없음제목.innerText(), '권한이 없습니다');
    });
  } finally {
    for (const 번호 of 만든글들) await 글지우기(page.request, 번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
