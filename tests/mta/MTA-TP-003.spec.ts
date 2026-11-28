import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버 } from './helpers/app.helper.js';
import { 가입규칙화면으로, 가입서버고르기로가기, 글이될때까지읽기, 시작화면으로 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 가입양식 } from './pages/signup.page.js';
import { 규칙화면 } from './pages/rules.page.js';
import { 가입서버고르기, 서버오류창, 초대링크창 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 다음누르기 = defineCase({
  tcId: 'MTA-FN-033',
  name: '서버를 고르고 「다음」을 누르면 진행 창 뒤에 서버 규칙 화면으로 간다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기에서 우리 서버 카드를 골랐다'],
  params: z.object({}),
  expected: null,
});

const 동의하고가입양식 = defineCase({
  tcId: 'MTA-FN-043',
  name: '가입 경로에서 우리 서버를 고르고 규칙 · 개인정보에 동의하면 앱 안 가입 양식 「계정 만들기」가 열린다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 마스토돈아님 = defineCase({
  tcId: 'MTA-FN-038',
  name: '마스토돈이 아닌 서버를 적고 키보드 완료를 누르면 「오류」 창에 「example.com는 마스토돈 서버인 것 같지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 서버입력: z.string().min(1).describe('입력 칸에 적을 서버 — 마스토돈이 아닌 도메인').default('example.com') }),
  expected: z.object({ 창제목: z.string().describe('오류 창 제목').default('오류'), 창글: z.string().describe('오류 창 문구').default('example.com는 마스토돈 서버인 것 같지 않습니다.') }),
});

const 도메인없음 = defineCase({
  tcId: 'MTA-FN-693',
  name: '도메인을 찾을 수 없는 서버를 적고 키보드 완료를 누르면 「오류」 창에 「qa-no-such-host.invalid는 마스토돈 서버인 것 같지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['가입용 서버 고르기 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({ 서버입력: z.string().min(1).describe('입력 칸에 적을 서버 — 도메인이 없는 주소').default('qa-no-such-host.invalid') }),
  expected: z.object({ 창제목: z.string().describe('오류 창 제목').default('오류'), 창글: z.string().describe('오류 창 문구').default('qa-no-such-host.invalid는 마스토돈 서버인 것 같지 않습니다.') }),
});

const 무효초대 = defineCase({
  tcId: 'MTA-FN-603',
  name: '무효한 초대 링크를 넣고 「다음」을 누르면 입력 창에 「이 초대 링크는 유효하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['「초대 링크 입력하기」 창이 열려 있다'],
  params: z.object({ 초대링크: z.string().min(1).describe('초대 링크 칸에 넣을 링크 — 우리 서버에 없는 초대 코드').default(`https://${서버}/invite/qa000000`) }),
  expected: z.object({ 안내: z.string().describe('입력 창 안내 문구').default('이 초대 링크는 유효하지 않습니다.') }),
});

const 만료초대 = defineCase({
  tcId: 'MTA-FN-602',
  name: '만료된 초대 링크를 넣으면 「만료된 초대 링크」 안내 창과 입력 창 「이 초대 링크는 만료되었습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['만료된 초대 링크가 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 만료된 초대 링크를 만들 수 없다',
  params: z.object({ 만료초대링크: z.string().min(1).describe('초대 링크 칸에 넣을 만료된 초대 링크') }),
  expected: z.object({
    창제목: z.string().describe('안내 창 제목').default('만료된 초대 링크'),
    안내: z.string().describe('입력 창 안내 문구').default('이 초대 링크는 만료되었습니다.'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-003',
  name: '가입 서버 고르기 — 진행과 오류',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [다음누르기, 동의하고가입양식, 마스토돈아님, 도메인없음, 무효초대, 만료초대],
});

test(procedure, async ({ driver }) => {
  const 고르기 = new 가입서버고르기(driver);
  const 오류창 = new 서버오류창(driver);
  const 초대창 = new 초대링크창(driver);

  await test.case(다음누르기, async () => {
    await test.step('우리 서버 카드를 고르고 「다음」을 누른다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(서버);
      await verify('가입용 서버 고르기에서 우리 서버 카드가 보인다', await 고르기.카드있나(서버, 20_000), true, { blocker: true });
      await 고르기.카드고르기(서버);
      await verify('가입용 서버 고르기에서 우리 서버 카드를 골라 「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
      await 고르기.다음누르기();
      await verify('서버를 고르고 「다음」을 누르면 진행 창 뒤에 서버 규칙 화면으로 간다', await new 규칙화면(driver).떴나(60_000), true);
    });
  });

  await test.case(동의하고가입양식, async () => {
    await test.step('우리 서버를 고르고 규칙 · 개인정보에 동의한다', async () => {
      await 시작화면으로(driver);
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await verify('우리 서버를 골라 서버 규칙 화면이 열려 있다', await 가입규칙화면으로(driver), true, { blocker: true });
      await new 규칙화면(driver).동의누르기();
      const 개인정보 = new 개인정보화면(driver);
      await verify('서버 규칙에 동의해 개인정보 화면이 열려 있다', await 개인정보.떴나(), true, { blocker: true });
      await 개인정보.동의누르기();
      await verify('가입 경로에서 우리 서버를 고르고 규칙 · 개인정보에 동의하면 앱 안 가입 양식 「계정 만들기」가 열린다', await new 가입양식(driver).떴나(60_000), true);
    });
  });

  await test.case(마스토돈아님, async ({ params, expected }) => {
    await test.step('마스토돈이 아닌 「example.com」을 적고 키보드 완료를 누른다', async () => {
      await 시작화면으로(driver);
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.서버입력);
      await 고르기.완료누르기();
      const 떴다 = await verify('「오류」 창이 뜬다', await 오류창.떴나(), true);
      const 제목 = await verify('오류 창 제목이 「오류」다', await 글이될때까지읽기(driver, () => 오류창.제목글(), expected.창제목, 5_000), expected.창제목);
      const 글 = await verify('오류 창에 「example.com는 마스토돈 서버인 것 같지 않습니다.」가 보인다', await 오류창.글읽기(), expected.창글);
      await verify('마스토돈이 아닌 서버를 적고 키보드 완료를 누르면 「오류」 창에 「example.com는 마스토돈 서버인 것 같지 않습니다.」가 보인다', 떴다 && 제목 && 글, true);
    });
  });

  await test.case(도메인없음, async ({ params, expected }) => {
    await test.step('도메인이 없는 「qa-no-such-host.invalid」를 적고 키보드 완료를 누른다', async () => {
      await 시작화면으로(driver);
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.서버입력);
      await 고르기.완료누르기();
      const 떴다 = await verify('「오류」 창이 뜬다', await 오류창.떴나(), true);
      const 제목 = await verify('오류 창 제목이 「오류」다', await 글이될때까지읽기(driver, () => 오류창.제목글(), expected.창제목, 5_000), expected.창제목);
      const 글 = await verify('오류 창에 「qa-no-such-host.invalid는 마스토돈 서버인 것 같지 않습니다.」가 보인다', await 오류창.글읽기(), expected.창글);
      await verify('도메인을 찾을 수 없는 서버를 적고 키보드 완료를 누르면 「오류」 창에 「qa-no-such-host.invalid는 마스토돈 서버인 것 같지 않습니다.」가 보인다', 떴다 && 제목 && 글, true);
    });
  });

  await test.case(무효초대, async ({ params, expected }) => {
    await test.step('초대 링크 칸에 무효한 「https://mastodon.maxihan.com/invite/qa000000」을 넣고 「다음」을 누른다', async () => {
      await 시작화면으로(driver);
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.초대링크누르기();
      await verify('「초대 링크 입력하기」 창이 열려 있다', await 초대창.떴나(), true, { blocker: true });
      await 초대창.적기(params.초대링크);
      await 초대창.다음누르기();
      await verify('무효한 초대 링크를 넣고 「다음」을 누르면 입력 창에 「이 초대 링크는 유효하지 않습니다.」가 보인다', await 글이될때까지읽기(driver, () => 초대창.안내글(2_000), expected.안내, 15_000), expected.안내);
    });
  });

  await test.case(만료초대, async ({ params, expected }) => {
    await test.step('초대 링크 칸에 만료된 초대 링크를 넣고 「다음」을 누른다', async () => {
      await 시작화면으로(driver);
      await verify('가입용 서버 고르기 화면이 열려 있다', await 가입서버고르기로가기(driver), true, { blocker: true });
      await 고르기.초대링크누르기();
      await verify('「초대 링크 입력하기」 창이 열려 있다', await 초대창.떴나(), true, { blocker: true });
      await 초대창.적기(params.만료초대링크);
      await 초대창.다음누르기();
      const 안내창 = await verify('「만료된 초대 링크」 안내 창이 보인다', await 글이될때까지읽기(driver, () => 오류창.제목글(), expected.창제목, 10_000), expected.창제목);
      const 입력창 = await verify('입력 창에 「이 초대 링크는 만료되었습니다.」가 보인다', await 글이될때까지읽기(driver, () => 초대창.안내글(2_000), expected.안내, 15_000), expected.안내);
      await verify('만료된 초대 링크를 넣으면 「만료된 초대 링크」 안내 창과 입력 창 「이 초대 링크는 만료되었습니다.」가 보인다', 안내창 && 입력창, true);
    });
  });
});
