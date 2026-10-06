import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 글목록받기, 글본문10자, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-213',
  name: '분류를 고르지 않으면 글이 등록되지 않는다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);
    const 글제목 = 고유이름('분류없는글');

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
      await 쓰기.확인창받기('accept');
    });

    await test.step('분류를 고르지 않고 제목과 본문을 적어 「등록」을 누른다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.채우기({ 제목: 글제목, 본문: 글본문10자 });
      await 쓰기.등록하기();
      await 쓰기.토스트.전부.first().waitFor();
      await verify(
        '분류를 고르지 않으면 글이 등록되지 않는다',
        { 경로: await 쓰기.경로읽기(), 등록된글: (await 글목록받기(page.request, { field: 'title', q: 글제목 })).items.length },
        { 경로: '/board/write', 등록된글: 0 },
      );
    });

    await test.step('회원으로 글쓰기 화면의 분류 선택 상자를 연다', async () => {
      await 쓰기.열기();
      await verify('회원의 분류 선택 상자에는 「공지」가 없다', (await 쓰기.분류글자들읽기()).includes('공지'), false);
    });
  } finally {
    await 정리.비우기();
  }
});
