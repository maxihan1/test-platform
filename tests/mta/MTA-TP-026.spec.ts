import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내글지우기 } from './helpers/api.helper.js';
import { 사진붙이기, 새글쓰기열기, 올라온글기다리기, 화면에글자있나 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 글쓰기첨부 } from './pages/compose-media.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 첨부개수한도 = defineCase({
  tcId: 'MTA-FN-227',
  name: '첨부가 4개면 개수 토스트 없이 다 붙는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 글쓰기에 사진 3장을 붙였다', '글쓰기에 사진 4장이 붙어 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    개수: z.number().describe('붙일 수 있는 첨부 최대 개수').default(4),
    토스트: z.string().describe('다섯째 사진을 고를 때 뜨는 토스트 글').default('4개의 미디어를 초과해서 첨부할 수 없습니다'),
  }),
});

const 큰화소사진 = defineCase({
  tcId: 'MTA-FN-633',
  name: '화소가 큰 이미지를 붙여 게시하면 크기 검사 없이 줄여 올라간다',
  platforms: ['android'],
  precondition: ['폰에 화소가 33177600 을 넘는 사진 파일이 있다'],
  held: '보류 — 화소가 33177600 을 넘는 사진 파일을 폰에 넣을 길이 없다',
  params: z.object({ 본문: z.string().min(1).max(500).describe('올릴 글 — 「QA TP026」으로 시작하는 500자까지').default('QA TP026 큰 화소 사진') }),
  expected: null,
});

const 언어감지실패 = defineCase({
  tcId: 'MTA-FN-636',
  name: '언어 감지에 실패하면 「언어를 감지할 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['언어 감지가 실패하는 본문이 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 언어 감지를 실패시키는 본문을 찾지 못했다',
  params: z.object({ 본문: z.string().describe('본문에 적을 글 — 언어 감지가 실패하는 글(아직 못 찾아 비워 둠)').optional() }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-026',
  name: '글쓰기 — 첨부 개수와 보류 항목',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [첨부개수한도, 큰화소사진, 언어감지실패],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 작성 = new 글쓰기화면(driver);
  const 첨부 = new 글쓰기첨부(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP026');
  });

  await test.case(첨부개수한도, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 사진 3장을 붙인 새 글쓰기 화면을 연다', async () => {
      await 내글지우기(나!, 'QA TP026');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 새글쓰기열기(driver);
      await 사진붙이기(driver, 작성);
      await 첨부.첨부가될때까지(1);
      await 사진붙이기(driver, 작성);
      await 첨부.첨부가될때까지(2);
      await 사진붙이기(driver, 작성);
      await verify('글쓰기에 사진 3장이 붙는다', await 첨부.첨부가될때까지(3), true, { blocker: true });
    });
    await test.step('넷째 사진을 붙인다', async () => {
      await 사진붙이기(driver, 작성);
      const 토스트없음 = !(await 작성.토스트에글자있나(expected.토스트, 3_000));
      const 넷 = await 첨부.첨부가될때까지(expected.개수);
      await verify('첨부가 4개면 개수 토스트 없이 다 붙는다', 토스트없음 && 넷, true);
    });
    await test.step('다섯째 사진을 고른다', async () => {
      await 사진붙이기(driver, 작성);
      await verify('첨부가 4개일 때 다섯째 사진에는 토스트 「4개의 미디어를 초과해서 첨부할 수 없습니다」가 보인다', await 작성.토스트에글자있나(expected.토스트, 8_000), true);
    });
  });

  await test.case(큰화소사진, async ({ params }) => {
    await test.step('큰 화소 사진을 붙이고 「게시」를 누른다', async () => {
      await 새글쓰기열기(driver);
      await 사진붙이기(driver, 작성);
      await 첨부.첨부가될때까지(1);
      await 작성.본문적기(params.본문);
      await 작성.게시누르기();
      const 올림 = await 올라온글기다리기(driver, 나!, params.본문);
      await verify('화소가 큰 이미지를 붙여 게시하면 크기 검사 없이 줄여 올라간다', 올림?.media_attachments.length === 1, true);
    });
  });

  await test.case(언어감지실패, async ({ params }) => {
    await test.step('감지가 안 되는 본문으로 언어 감지를 기다린다', async () => {
      await 새글쓰기열기(driver);
      await 작성.본문적기(params.본문 ?? '');
      await verify('언어 감지에 실패하면 「언어를 감지할 수 없습니다」가 보인다', await 화면에글자있나(driver, '언어를 감지할 수 없습니다', 15_000), true);
    });
  });
});
