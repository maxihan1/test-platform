import { defineCase, defineProcedure, test, type 폰파일, verify, 폰에파일넣기 } from '@platform/kit';
import { 될때까지, 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { type 계정, 계정꺼내기, 내글지우기, api } from './helpers/api.helper.js';
import { 내글들, 새글쓰기열기, 올라온글기다리기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 파일선택기에서고르기 } from './helpers/system-ui.helper.js';
import { 대체텍스트화면 } from './pages/alt-text.page.js';
import { 글쓰기첨부 } from './pages/compose-media.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 사진조각 = defineCase({
  tcId: 'MTA-FN-213',
  name: '파일 선택기에서 사진을 고르면 미디어 조각에 「대체 텍스트 추가」 · 제거(X) 버튼과 업로드 진행이 보인다',
  platforms: ['android'],
  precondition: ['폰에 qa 사진 파일이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진크기: z.number().int().min(10_000).describe('폰에 넣을 사진 크기(바이트)').default(9_000_000),
  }),
  expected: z.object({ 조각글: z.string().describe('미디어 조각 제목').default('대체 텍스트 추가') }),
});

const 큰사진오류 = defineCase({
  tcId: 'MTA-FN-639',
  name: '16MB 를 넘는 이미지를 붙이면 업로드 오류 안내가 보인다',
  platforms: ['android'],
  precondition: ['폰에 16MB 를 넘는 사진 파일이 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 사진크기: z.number().int().min(16_777_217).describe('폰에 넣을 사진 크기(바이트) — 16MB 넘게').default(17_000_000) }),
  expected: z.object({ 조각글: z.string().describe('업로드 오류 때 조각 제목').default('업로드 실패') }),
});

const 끊김업로드실패 = defineCase({
  tcId: 'MTA-FN-214',
  name: '미디어 업로드가 실패하면 조각에 「업로드 실패」와 재시도가 보인다',
  platforms: ['android'],
  precondition: ['폰에 qa 사진 파일이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({ 조각글: z.string().describe('업로드 실패 때 조각 제목').default('업로드 실패') }),
});

const 대체텍스트화면모양 = defineCase({
  tcId: 'MTA-UI-225',
  name: '대체 텍스트 입력 화면에 제목 「대체 텍스트 추가」 · 미리보기 · 입력 힌트 「대체 텍스트」 · 도움말 「대체 텍스트란 무엇인가요?」가 보인다',
  platforms: ['android'],
  precondition: ['글쓰기에 사진 하나가 붙어 있다'],
  params: z.object({}),
  expected: z.object({
    힌트: z.string().describe('입력 칸 힌트').default('대체 텍스트'),
    도움말: z.string().describe('도움말 창 제목').default('대체 텍스트란 무엇인가요?'),
  }),
});

const 만자붙여넣기 = defineCase({
  tcId: 'MTA-FN-279',
  name: '대체 텍스트 칸에 10000자를 붙여 넣으면 10000자가 다 들어간다',
  platforms: ['android'],
  precondition: ['글쓰기에 사진 하나가 붙어 있다'],
  params: z.object({ 설명: z.string().length(10_000).describe('붙여 넣을 대체 텍스트 — 10000자').default('가'.repeat(10_000)) }),
  expected: z.object({ 길이: z.number().describe('들어간 글자 수').default(10_000) }),
});

const 만자게시 = defineCase({
  tcId: 'MTA-FN-638',
  name: '대체 텍스트 10000자로 게시하면 글이 올라간다',
  platforms: ['android'],
  precondition: ['글쓰기에 사진 하나가 붙어 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    설명: z.string().length(10_000).describe('붙여 넣을 대체 텍스트 — 10000자').default('가'.repeat(10_000)),
    본문: z.string().min(1).describe('올릴 글 — 「QA TP078」로 시작').default('QA TP078 만자'),
    넘는본문: z.string().min(1).describe('올려 볼 글 — 「QA TP078」로 시작').default('QA TP078 만일자'),
    넘는설명: z.string().length(10_001).describe('붙여 넣을 대체 텍스트 — 10001자').default('가'.repeat(10_001)),
  }),
  expected: null,
});

const 설명저장 = defineCase({
  tcId: 'MTA-FN-280',
  name: '대체 텍스트 화면을 닫고 게시하면 서버의 그 사진 설명이 「QA 사진 설명」이다',
  platforms: ['android'],
  precondition: ['글쓰기 사진에 대체 텍스트 「QA 사진 설명」을 적었다'],
  params: z.object({
    설명: z.string().min(1).describe('적을 대체 텍스트').default('QA 사진 설명'),
    본문: z.string().min(1).describe('올릴 글 — 「QA TP078」로 시작').default('QA TP078 설명'),
  }),
  expected: null,
});

const 미리보기확대 = defineCase({
  tcId: 'MTA-FN-278',
  name: '대체 텍스트 미리보기를 누르면 사진이 확대된다',
  platforms: ['android'],
  precondition: ['대체 텍스트 입력 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-078',
  name: '글쓰기 — 사진 조각과 대체 텍스트',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [사진조각, 대체텍스트화면모양, 만자붙여넣기, 설명저장, 미리보기확대, 끊김업로드실패, 만자게시, 큰사진오류],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 첨부 = new 글쓰기첨부(driver);
  const 대체 = new 대체텍스트화면(driver);
  const 넣은파일들: 폰파일[] = [];
  let 나: 계정 | undefined;
  let 작은사진 = '';

  const 사진붙인글쓰기 = async (이름: string): Promise<글쓰기화면> => {
    const 글쓰기 = await 새글쓰기열기(driver);
    await 글쓰기.도구길게누르기('미디어');
    await 파일선택기에서고르기(driver, 이름);
    return 글쓰기;
  };

  await test.cleanup('이 흐름이 올린 글을 지운다', async () => {
    if (나 !== undefined) await 내글지우기(나, 'QA TP078');
  });

  await test.cleanup('폰에 넣은 파일을 지운다', async () => {
    for (const 파일 of 넣은파일들) await 파일.지우기();
  });

  await test.case(사진조각, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    let 사진: 폰파일 | undefined;
    await test.step('일반 회원으로 홈에 들어가 폰에 qa 사진 파일을 넣는다', async () => {
      await 내글지우기(나!, 'QA TP078');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      사진 = await 폰에파일넣기(driver, '사진', { 크기: params.사진크기 });
      넣은파일들.push(사진);
      const 작은 = await 폰에파일넣기(driver, '사진');
      넣은파일들.push(작은);
      작은사진 = 작은.이름;
    });
    await test.step('파일 선택기에서 사진 하나를 고른다', async () => {
      await 사진붙인글쓰기(사진!.이름);
      const 진행 = await verify('미디어 조각에 업로드 진행이 보인다', await 첨부.업로드진행있나(), true);
      const 제목 = await verify('미디어 조각에 「대체 텍스트 추가」가 보인다', await 첨부.조각글있나(expected.조각글, 0, 30_000), true);
      const 제거 = await verify('미디어 조각에 제거(X) 버튼이 보인다', await 첨부.조각삭제있나(), true);
      await verify('파일 선택기에서 사진을 고르면 미디어 조각에 「대체 텍스트 추가」 · 제거(X) 버튼과 업로드 진행이 보인다', 제목 && 제거 && 진행, true);
    });
  });

  await test.case(대체텍스트화면모양, async ({ expected }) => {
    await test.step('사진 하나를 붙인 글쓰기를 연다', async () => {
      await 사진붙인글쓰기(작은사진);
      if (!(await 첨부.조각글있나('대체 텍스트 추가', 0, 30_000))) throw new Error('사진 조각이 안 붙었다');
    });
    await test.step('미디어 조각의 「대체 텍스트 추가」를 누른다', async () => {
      await 첨부.조각편집누르기();
      const 제목 = await verify('대체 텍스트 입력 화면 제목 「대체 텍스트 추가」가 보인다', await 대체.떴나(), true);
      const 미리보기 = await verify('미리보기가 보인다', await 대체.미리보기있나(), true);
      const 힌트 = await verify('입력 힌트 「대체 텍스트」가 보인다', await 대체.칸글(), expected.힌트);
      const 창 = await 대체.도움말누르기();
      const 도움말 = await verify('도움말 「대체 텍스트란 무엇인가요?」가 보인다', (await 창.제목글()) === expected.도움말, true);
      await 창.확인누르기();
      await verify('대체 텍스트 입력 화면에 제목 「대체 텍스트 추가」 · 미리보기 · 입력 힌트 「대체 텍스트」 · 도움말 「대체 텍스트란 무엇인가요?」가 보인다', 제목 && 미리보기 && 힌트 && 도움말, true);
    });
  });

  await test.case(만자붙여넣기, async ({ params, expected }) => {
    await test.step('대체 텍스트 칸에 10000자를 붙여 넣는다', async () => {
      if (!(await 대체.떴나())) throw new Error('대체 텍스트 입력 화면이 안 열려 있다');
      await 대체.칸에붙여넣기(params.설명);
      await verify('대체 텍스트 칸에 10000자를 붙여 넣으면 10000자가 다 들어간다', (await 대체.칸글()).length, expected.길이);
    });
  });

  await test.case(설명저장, async ({ params }) => {
    await test.step('글쓰기 사진에 대체 텍스트를 적는다', async () => {
      if (await 대체.떴나(1_000)) await 대체.닫기();
      const 창 = new 확인창(driver);
      if (await 창.떴나(1_000)) await 창.확인누르기();
      await 사진붙인글쓰기(작은사진);
      if (!(await 첨부.조각글있나('대체 텍스트 추가', 0, 30_000))) throw new Error('사진 조각이 안 붙었다');
      await 첨부.조각편집누르기();
      if (!(await 대체.떴나())) throw new Error('대체 텍스트 입력 화면이 안 열렸다');
      await 대체.칸에쓰기(params.설명);
    });
    await test.step('대체 텍스트를 적고 돌아와 「게시」를 누른다', async () => {
      await 대체.닫기();
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.본문적기(params.본문);
      await 글쓰기.게시누르기();
      const 올린글 = await 올라온글기다리기(driver, 나!, params.본문);
      const 설명 = 올린글 === undefined ? '' : ((await api<{ media_attachments: { description: string | null }[] }>(나!, 'GET', `/api/v1/statuses/${올린글.id}`)).media_attachments[0]?.description ?? '');
      await verify('대체 텍스트 화면을 닫고 게시하면 서버의 그 사진 설명이 「QA 사진 설명」이다', 설명, params.설명);
    });
  });

  await test.case(미리보기확대, async () => {
    await test.step('대체 텍스트 입력 화면을 연다', async () => {
      if (await 대체.떴나(1_000)) await 대체.닫기();
      await 사진붙인글쓰기(작은사진);
      if (!(await 첨부.조각글있나('대체 텍스트 추가', 0, 30_000))) throw new Error('사진 조각이 안 붙었다');
      await 첨부.조각편집누르기();
      if (!(await 대체.떴나())) throw new Error('대체 텍스트 입력 화면이 안 열렸다');
    });
    await test.step('대체 텍스트 미리보기를 누른다', async () => {
      await 대체.미리보기누르기();
      await verify('대체 텍스트 미리보기를 누르면 사진이 확대된다', await 대체.사진보기떴나(), true);
      await driver.back();
      await 대체.닫기();
    });
  });

  await test.case(끊김업로드실패, async ({ expected }) => {
    await test.step('새 글쓰기 화면을 연다', async () => {
      const 글쓰기 = await 새글쓰기열기(driver);
      await 글쓰기.도구길게누르기('미디어');
    });
    await test.step('통신을 끊은 채 사진을 붙인다', async () => {
      let 실패글 = false;
      let 재시도 = false;
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 파일선택기에서고르기(driver, 작은사진);
        실패글 = await 첨부.조각글있나(expected.조각글, 0, 30_000);
        재시도 = await 첨부.재시도있나();
      });
      const 실패 = await verify('조각에 「업로드 실패」가 보인다', 실패글, true);
      const 다시 = await verify('조각에 재시도가 보인다', 재시도, true);
      await verify('미디어 업로드가 실패하면 조각에 「업로드 실패」와 재시도가 보인다', 실패 && 다시, true);
    });
  });

  await test.case(만자게시, async ({ params }) => {
    await test.step('사진을 붙이고 대체 텍스트 칸에 10000자를 붙여 넣는다', async () => {
      if (await 대체.떴나(1_000)) await 대체.닫기();
      await 사진붙인글쓰기(작은사진);
      if (!(await 첨부.조각글있나('대체 텍스트 추가', 0, 30_000))) throw new Error('사진 조각이 안 붙었다');
      await 첨부.조각편집누르기();
      if (!(await 대체.떴나())) throw new Error('대체 텍스트 입력 화면이 안 열렸다');
      await 대체.칸에붙여넣기(params.설명);
    });
    await test.step('대체 텍스트 10000자로 「게시」를 누른다', async () => {
      await 대체.닫기();
      const 글쓰기 = new 글쓰기화면(driver);
      await 글쓰기.본문적기(params.본문);
      await 글쓰기.게시누르기();
      await verify('대체 텍스트 10000자로 게시하면 글이 올라간다', (await 올라온글기다리기(driver, 나!, params.본문)) !== undefined, true);
    });
    await test.step('대체 텍스트 10001자로 「게시」를 누른다', async () => {
      const 글쓰기 = await 사진붙인글쓰기(작은사진);
      if (!(await 첨부.조각글있나('대체 텍스트 추가', 0, 30_000))) throw new Error('사진 조각이 안 붙었다');
      await 첨부.조각편집누르기();
      if (!(await 대체.떴나())) throw new Error('대체 텍스트 입력 화면이 안 열렸다');
      await 대체.칸에붙여넣기(params.넘는설명);
      await 대체.닫기();
      await 글쓰기.본문적기(params.넘는본문);
      await 글쓰기.게시누르기();
      const 안내 = await new 확인창(driver).떴나(20_000);
      const 안올라감 = !(await 될때까지(driver, async () => (await 내글들(나!, params.넘는본문)).length > 0, 10_000));
      await verify('대체 텍스트 10001자로는 오류 안내가 보이고 글이 올라가지 않는다', 안내 && 안올라감, true);
    });
  });

  await test.case(큰사진오류, async ({ params, expected }) => {
    let 큰사진: 폰파일 | undefined;
    await test.step('폰에 16MB 를 넘는 사진 파일을 넣는다', async () => {
      큰사진 = await 폰에파일넣기(driver, '사진', { 크기: params.사진크기 });
      넣은파일들.push(큰사진);
    });
    await test.step('16MB 를 넘는 사진을 붙인다', async () => {
      await 사진붙인글쓰기(큰사진!.이름);
      await verify('16MB 를 넘는 이미지를 붙이면 업로드 오류 안내가 보인다', await 첨부.조각글있나(expected.조각글, 0, 60_000), true);
    });
  });
});
