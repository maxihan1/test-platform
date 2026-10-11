import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 등록뒤글번호, 작은이미지, 창기록하며받기 } from './helpers/board.helper.js';
import { 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-069',
  name: '이미지를 첨부하면 입력칸 아래에 미리보기가 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 창들 = 창기록하며받기(page);
  const 제목 = 고유제목(spec.tcId, '임시 저장');
  const 본문 = '임시 저장해 두었다가 불러오는 글의 본문입니다.';
  const 만든글들: number[] = [];

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await 글쓰기.열기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
    });

    await test.step('png 이미지 한 장을 첨부한다', async () => {
      await 글쓰기.이미지넣기([작은이미지('a.png')]);
      await 글쓰기.미리보기들.first().waitFor();
      const 입력칸 = await 글쓰기.본문칸.boundingBox();
      const 미리보기 = await 글쓰기.미리보기들.first().boundingBox();
      await verify(
        '이미지를 첨부하면 입력칸 아래에 미리보기가 보인다',
        { 미리보기: await 글쓰기.미리보기들.count(), 아래: 입력칸 !== null && 미리보기 !== null && 미리보기.y >= 입력칸.y + 입력칸.height },
        { 미리보기: 1, 아래: true },
      );
    });

    await test.step('미리보기의 X 를 누른다', async () => {
      await 글쓰기.이미지빼기버튼.click();
      await 글쓰기.이미지빼기버튼.waitFor({ state: 'detached' });
      await verify('미리보기의 X 를 누르면 그 이미지가 빠진다', await 글쓰기.미리보기들.count(), 0);
    });

    await test.step('분류 · 제목 · 본문을 적고 「임시 저장」 을 누른다', async () => {
      await 글쓰기.채우기({ 분류: '자유', 제목, 본문 });
      await 글쓰기.임시저장버튼.click();
      await 알림.글('임시 저장되었습니다').waitFor();
      await verify(
        '「임시 저장」 을 누르면 지금 쓴 내용이 이 브라우저에 저장된다',
        JSON.parse((await page.evaluate(() => localStorage.getItem('dm_draft'))) ?? '{}'),
        { category: '자유', title: 제목, content: 본문 },
      );
    });

    await test.step('글쓰기 화면을 다시 열고 확인 창에서 「확인」 을 누른다', async () => {
      const 전 = 창들.length;
      await 글쓰기.열기();
      await 글쓰기.제목채워질때까지기다리기();
      await verify(
        '임시 저장 뒤 글쓰기를 다시 열면 확인 창 「임시 저장된 글이 있습니다. 불러올까요?」 가 뜨고 확인하면 내용이 채워진다',
        {
          확인창: 창들.slice(전).filter((창) => 창.종류 === 'confirm').map((창) => 창.메시지),
          분류: await 글쓰기.고른분류(),
          제목: await 글쓰기.제목칸.inputValue(),
          본문: await 글쓰기.본문칸.inputValue(),
        },
        { 확인창: ['임시 저장된 글이 있습니다. 불러올까요?'], 분류: '자유', 제목, 본문 },
      );
    });

    await test.step('내용을 쓴 채 화면을 닫으려 한다', async () => {
      const 둘째쪽 = await page.context().newPage();
      const 둘째쪽창들 = 창기록하며받기(둘째쪽);
      try {
        await 둘째쪽.goto('/board/write');
        const 둘째글쓰기 = new 글쓰기화면(둘째쪽);
        await 둘째글쓰기.폼준비.waitFor();
        await 둘째글쓰기.제목칸.click();
        await 둘째글쓰기.제목칸.fill('나가기 확인을 보려고 적은 제목');
        const 닫힘 = 둘째쪽.waitForEvent('close');
        await 둘째쪽.close({ runBeforeUnload: true });
        await 닫힘;
        await verify('내용을 쓴 채 화면을 닫으려 하면 브라우저의 나가기 확인 창이 뜬다', 둘째쪽창들.filter((창) => 창.종류 === 'beforeunload').length, 1);
      } finally {
        if (!둘째쪽.isClosed()) await 둘째쪽.close();
      }
    });

    await test.step('불러온 글을 「등록」 한다', async () => {
      const 응답 = await 글쓰기.등록누르고응답받기();
      const 번호 = await 등록뒤글번호(page, 응답);
      if (번호 !== null) 만든글들.push(번호);
      await 알림.모두.first().waitFor();
      await verify(
        '글을 등록하면 방금 쓴 글의 상세로 가고 토스트 「등록되었습니다」 가 보인다',
        { 상세제목: await 상세.제목.innerText(), 토스트: await 알림.모두.allInnerTexts() },
        { 상세제목: 제목, 토스트: ['등록되었습니다'] },
      );
    });

    await test.step('등록한 뒤 글쓰기 화면을 다시 연다', async () => {
      const 전 = 창들.length;
      await 글쓰기.열기();
      await verify('글을 등록한 뒤 글쓰기를 다시 열면 임시 저장 확인 창이 뜨지 않는다', 창들.slice(전).filter((창) => 창.종류 === 'confirm').length, 0);
    });
  } finally {
    for (const 번호 of 만든글들) await 글지우기(page.request, 번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
