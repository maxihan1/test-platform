import { defineCase, defineProcedure, test, type 폰파일, verify, 폰에파일넣기 } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내글지우기 } from './helpers/api.helper.js';
import { 동작스위치맞추기, 사진붙이기, 사진선택기닫기, 새글쓰기열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 사진선택기떴나, 파일선택기에서고르기 } from './helpers/system-ui.helper.js';
import { 글쓰기첨부 } from './pages/compose-media.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 사진선택기열림 = defineCase({
  tcId: 'MTA-FN-240',
  name: 'Android 13 이상 폰에서 「미디어 추가」를 누르면 시스템 사진 선택기가 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 새 글쓰기 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 파일선택기열림 = defineCase({
  tcId: 'MTA-FN-241',
  name: '「미디어 추가」를 길게 누르면 파일 선택기가 열린다',
  platforms: ['android'],
  precondition: ['새 글쓰기 화면이 열려 있고 폰에 qa 사진 파일이 있다'],
  params: z.object({}),
  expected: null,
});

const 지원안되는형식 = defineCase({
  tcId: 'MTA-FN-632',
  name: '지원하지 않는 형식을 고르면 토스트 「<파일> 파일은 지원되지 않는 타입입니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 파일 선택기에 넣은 txt 파일이 안 보인다',
  precondition: ['폰에 qa 글 파일(txt)이 있다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('지원하지 않는 형식 토스트에서 파일 이름 뒤의 글').default('파일은 지원되지 않는 타입입니다') }),
});

const 영상크기경계 = defineCase({
  tcId: 'MTA-FN-230',
  name: '99MB 영상을 고르면 크기 토스트 없이 첨부된다',
  platforms: ['android'],
  precondition: ['폰에 99MB 영상 파일이 있다', '폰에 99MB 를 1바이트 넘는 영상 파일이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    영상크기: z.number().int().min(10_000).describe('폰에 넣을 영상 크기(바이트) — 99MB').default(103_809_024),
    넘는영상크기: z.number().int().min(10_000).describe('폰에 넣을 영상 크기(바이트) — 99MB 를 1바이트 넘는 크기').default(103_809_025),
  }),
  expected: z.object({ 초과토스트: z.string().describe('크기 초과 토스트에서 파일 이름 뒤의 글').default('파일은 업로드 제한인 99 MB를 초과합니다') }),
});

const 업로드중게시꺼짐 = defineCase({
  tcId: 'MTA-FN-223',
  name: '업로드가 다 끝나지 않으면 「게시」가 꺼져 있다',
  platforms: ['android'],
  precondition: ['폰에 30MB 영상 파일이 있다'],
  techniques: ['결정 테이블'],
  params: z.object({ 영상크기: z.number().int().min(10_000).describe('폰에 넣을 영상 크기(바이트) — 30MB').default(31_457_280) }),
  expected: null,
});

const 대체텍스트리마인더 = defineCase({
  tcId: 'MTA-FN-266',
  name: '대체 텍스트 리마인더가 켜져 있고 설명 없는 이미지가 있으면 게시할 때 「미디어에 대체 텍스트가 없습니다」 창과 「게시」 · 「취소」가 뜬다',
  platforms: ['android'],
  precondition: ['「대체 텍스트 리마인더 추가」를 켰고 글쓰기에 설명 없는 사진이 붙어 있다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP023」으로 시작하는 500자까지').default('QA TP023 대체 텍스트 리마인더') }),
  expected: z.object({
    게시: z.string().describe('창의 게시 버튼 글').default('게시'),
    취소: z.string().describe('창의 취소 버튼 글').default('취소'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-023',
  name: '글쓰기 — 미디어 붙이기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [사진선택기열림, 파일선택기열림, 영상크기경계, 업로드중게시꺼짐, 대체텍스트리마인더, 지원안되는형식],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 첨부 = new 글쓰기첨부(driver);
  let 나: 계정 | undefined;
  const 넣은파일들: 폰파일[] = [];

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP023');
  });

  await test.cleanup('폰에 넣은 파일을 지운다', async () => {
    for (const 파일 of 넣은파일들) await 파일.지우기();
  });

  await test.case(사진선택기열림, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 새 글쓰기 화면을 연다', async () => {
      await 내글지우기(나!, 'QA TP023');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('「미디어 추가」를 누른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구누르기('미디어');
      await verify('Android 13 이상 폰에서 「미디어 추가」를 누르면 시스템 사진 선택기가 열린다', await 사진선택기떴나(driver), true);
      await 사진선택기닫기(driver);
    });
  });

  await test.case(파일선택기열림, async () => {
    let 사진: 폰파일 | undefined;
    await test.step('폰에 qa 사진 파일을 넣고 새 글쓰기 화면을 연다', async () => {
      사진 = await 폰에파일넣기(driver, '사진');
      넣은파일들.push(사진);
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('「미디어 추가」를 길게 누른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구길게누르기('미디어');
      await verify('「미디어 추가」를 길게 누르면 파일 선택기가 열린다', await 첨부.파일선택기에파일있나(사진!.이름), true);
      await 첨부.파일선택기닫기(사진!.이름);
    });
  });

  await test.case(영상크기경계, async ({ params, expected }) => {
    let 영상: 폰파일 | undefined;
    await test.step('폰에 99MB 영상 파일을 넣고 새 글쓰기 화면을 연다', async () => {
      영상 = await 폰에파일넣기(driver, '영상', { 크기: params.영상크기 });
      넣은파일들.push(영상);
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('파일 선택기에서 99MB 영상을 고른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구길게누르기('미디어');
      await 파일선택기에서고르기(driver, 영상!.이름);
      const 토스트있음 = await 글쓰기.토스트에글자있나(`${영상!.이름} ${expected.초과토스트}`, 5_000);
      const 토스트없음 = await verify('크기 초과 토스트가 보이지 않는다', !토스트있음, true);
      const 첨부됨 = await verify('글쓰기에 영상 하나가 붙는다', await 첨부.첨부가될때까지(1, 30_000), true);
      await verify('99MB 영상을 고르면 크기 토스트 없이 첨부된다', 토스트없음 && 첨부됨, true);
    });
    let 넘는영상: 폰파일 | undefined;
    await test.step('폰에 99MB 를 1바이트 넘는 영상 파일을 넣고 새 글쓰기 화면을 연다', async () => {
      넘는영상 = await 폰에파일넣기(driver, '영상', { 크기: params.넘는영상크기 });
      넣은파일들.push(넘는영상);
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('파일 선택기에서 99MB 를 넘는 영상을 고른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구길게누르기('미디어');
      await 파일선택기에서고르기(driver, 넘는영상!.이름);
      await verify(
        '99MB 를 넘는 영상에는 토스트 「<파일> 파일은 업로드 제한인 99 MB를 초과합니다」가 보인다',
        await 글쓰기.토스트에글자있나(`${넘는영상!.이름} ${expected.초과토스트}`, 10_000),
        true,
      );
    });
  });

  await test.case(업로드중게시꺼짐, async ({ params }) => {
    let 영상: 폰파일 | undefined;
    await test.step('폰에 30MB 영상 파일을 넣고 새 글쓰기 화면을 연다', async () => {
      영상 = await 폰에파일넣기(driver, '영상', { 크기: params.영상크기 });
      넣은파일들.push(영상);
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('큰 영상을 붙이고 업로드 중에 「게시」를 확인한다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구길게누르기('미디어');
      await 파일선택기에서고르기(driver, 영상!.이름);
      await verify('글쓰기에 영상 하나가 붙는다', await 첨부.첨부가될때까지(1, 30_000), true, { blocker: true });
      await verify('업로드가 다 끝나지 않으면 「게시」가 꺼져 있다', !(await 글쓰기.게시켜졌나()), true);
    });
  });

  await test.case(대체텍스트리마인더, async ({ params, expected }) => {
    await test.step('「대체 텍스트 리마인더 추가」를 켠다', async () => {
      await 동작스위치맞추기(driver, '대체 텍스트 리마인더 추가', true);
    });
    await test.step('설명 없는 사진을 붙인 새 글쓰기 화면을 연다', async () => {
      const 글쓰기 = await 새글쓰기열기(driver);
      await 사진붙이기(driver, 글쓰기);
      await verify('글쓰기에 설명 없는 사진 하나가 붙는다', await 첨부.첨부가될때까지(1), true, { blocker: true });
      await 글쓰기.본문적기(params.본문);
    });
    await test.step('설명 없는 사진을 붙인 채 「게시」를 누른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      const 창 = 글쓰기.대체텍스트리마인더창();
      try {
        await 글쓰기.게시누르기();
        const 창뜸 = await verify('「미디어에 대체 텍스트가 없습니다」 창이 보인다', await 글쓰기.창에글자있나('미디어에 대체 텍스트가 없습니다', 10_000), true);
        const 게시 = await verify('창의 확인 버튼 글이 기대값과 같다', await 창.확인버튼글(), expected.게시);
        const 취소 = await verify('창의 취소 버튼 글이 기대값과 같다', await 창.취소버튼글(), expected.취소);
        await verify(
          '대체 텍스트 리마인더가 켜져 있고 설명 없는 이미지가 있으면 게시할 때 「미디어에 대체 텍스트가 없습니다」 창과 「게시」 · 「취소」가 뜬다',
          창뜸 && 게시 && 취소,
          true,
        );
        await 창.취소누르기();
      } finally {
        await 동작스위치맞추기(driver, '대체 텍스트 리마인더 추가', false);
      }
    });
  });

  await test.case(지원안되는형식, async ({ expected }) => {
    let 글파일: 폰파일 | undefined;
    await test.step('폰에 qa 글 파일을 넣고 새 글쓰기 화면을 연다', async () => {
      글파일 = await 폰에파일넣기(driver, '파일');
      넣은파일들.push(글파일);
      const 글쓰기 = await 새글쓰기열기(driver);
      await verify('새 글쓰기 화면이 보인다', await 글쓰기.새게시물떴나(), true, { blocker: true });
    });
    await test.step('파일 선택기에서 글 파일을 고른다', async () => {
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.도구길게누르기('미디어');
      await 파일선택기에서고르기(driver, 글파일!.이름);
      await verify(
        '지원하지 않는 형식을 고르면 토스트 「<파일> 파일은 지원되지 않는 타입입니다」가 보인다',
        await 글쓰기.토스트에글자있나(`${글파일!.이름} ${expected.안내}`, 10_000),
        true,
      );
    });
  });
});
