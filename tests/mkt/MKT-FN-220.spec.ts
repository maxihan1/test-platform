import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름, 글본문10자, 등록글정리, 정리함, 회원로그인 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-220',
  name: '임시 저장한 뒤 글쓰기에 다시 들어오면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」가 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 정리 = new 정리함();
  try {
    const 쓰기 = new 글쓰기화면(page);
    const 상세 = new 게시글상세화면(page);
    const 임시제목 = 고유이름('임시글');
    const 임시본문 = `${글본문10자} ${고유이름('임시본문')}`;
    let 확인창 = await Promise.resolve<Awaited<ReturnType<typeof 쓰기.열고확인창기다리기>> | undefined>(undefined);

    await test.step('새로 만든 회원으로 로그인한다', async () => {
      await 회원로그인(page.request, 정리);
      await 안내창끄기(page);
    });

    await test.step('제목과 본문을 적고 「임시 저장」을 누른 뒤 글쓰기 화면을 다시 연다', async () => {
      await 쓰기.열기();
      await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
      await 쓰기.채우기({ 제목: 임시제목, 본문: 임시본문 });
      await 쓰기.임시저장버튼.click();
      await 쓰기.토스트.기다리기('임시 저장되었습니다');
      확인창 = await 쓰기.열고확인창기다리기();
      await verify(
        '임시 저장한 뒤 글쓰기에 다시 들어오면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」가 뜬다',
        확인창.message(),
        '임시 저장된 글이 있습니다. 불러올까요?',
      );
    });

    await test.step('확인 창에서 「확인」을 누른다', async () => {
      if (!확인창) throw new Error('확인 창이 뜨지 않았다');
      await 쓰기.확인창누르고폼기다리기(확인창);
      await verify(
        '제목과 본문이 임시 저장한 내용으로 채워진다',
        { 제목: await 쓰기.제목읽기(), 본문: await 쓰기.본문읽기() },
        { 제목: 임시제목, 본문: 임시본문 },
      );
    });

    await test.step('불러온 글을 분류를 골라 등록하고 글쓰기 화면을 다시 연다', async () => {
      await 쓰기.채우기({ 분류: '자유' });
      await 쓰기.등록하기();
      await 상세.제목기다리기(임시제목);
      등록글정리(page.request, 정리, page.url());
      await 쓰기.확인창받기('dismiss');
      await 쓰기.열기();
      await verify('글을 등록한 뒤에는 임시 저장 확인 창이 뜨지 않는다', 쓰기.열린확인창들.length, 0);
    });
  } finally {
    await 정리.비우기();
  }
});
