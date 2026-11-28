import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 계정설정바꾸기 } from './helpers/api.helper.js';
import { 검색허용읽기, 계정설정열기, 굴려서줄있나, 줄켜졌나, 토큰살았나, 프라이버시설정열기 } from './helpers/flow-compose.helper.js';
import { 토큰받기, 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 줄스위치있나 } from './helpers/system-ui.helper.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 하단탭 } from './components/tabbar.component.js';
import { 계정설정화면 } from './pages/account-settings.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프라이버시설정화면 } from './pages/privacy-settings.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 서버소개화면 } from './pages/server-about.page.js';
import { 시작화면 } from './pages/start.page.js';

const 계정설정열림 = defineCase({
  tcId: 'MTA-FN-477',
  name: '내 프로필 메뉴 「계정 설정」을 누르면 제목 「@qa_user1@mastodon.maxihan.com」 계정 설정이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 내 프로필 메뉴를 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 제목: z.string().describe('계정 설정 제목').default('@qa_user1@mastodon.maxihan.com') }),
});

const 계정설정항목 = defineCase({
  tcId: 'MTA-UI-408',
  name: '계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다',
  platforms: ['android'],
  precondition: ['계정 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 이미이계정 = defineCase({
  tcId: 'MTA-FN-484',
  name: '이미 이 계정이면 「이 계정으로 전환」이 꺼져 있다',
  platforms: ['android'],
  precondition: ['지금 쓰는 계정의 계정 설정이 열려 있다'],
  techniques: ['결정 테이블'],
  params: z.object({}),
  expected: null,
});

const 프라이버시스위치 = defineCase({
  tcId: 'MTA-UI-409',
  name: '「프라이버시와 노출 범위」에 「탐색 알고리즘에서 프로필과 게시물 우선 노출」 · 「공개 게시물을 검색 결과에 포함시키기」 스위치가 보인다',
  platforms: ['android'],
  precondition: ['계정 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 검색허용바꾸기 = defineCase({
  tcId: 'MTA-FN-480',
  name: '프라이버시 스위치를 바꾸면 서버 계정 설정 값도 바뀐다',
  platforms: ['android'],
  precondition: ['「프라이버시와 노출 범위」가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 서버소개열기 = defineCase({
  tcId: 'MTA-FN-481',
  name: '「이 서버에 대해서」를 누르면 탭 「mastodon.maxihan.com에 대해」 · 「규칙」이 보인다',
  platforms: ['android'],
  precondition: ['계정 설정이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    소개탭: z.string().describe('서버 소개 첫째 탭 이름').default('mastodon.maxihan.com에 대해'),
    규칙탭: z.string().describe('서버 소개 둘째 탭 이름').default('규칙'),
  }),
});

const 로그아웃창 = defineCase({
  tcId: 'MTA-FN-486',
  name: '「로그아웃」을 누르면 「@qa_user1@mastodon.maxihan.com 로그아웃?」 창과 「로그아웃」 · 「취소」가 뜬다',
  platforms: ['android'],
  precondition: ['계정 설정이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    창글: z.string().describe('로그아웃 확인 창 글').default('@qa_user1@mastodon.maxihan.com 로그아웃?'),
    로그아웃: z.string().describe('창의 확인 버튼 글').default('로그아웃'),
    취소: z.string().describe('창의 취소 버튼 글').default('취소'),
  }),
});

const 로그아웃실행 = defineCase({
  tcId: 'MTA-FN-487',
  name: '로그아웃하면 그 계정 토큰이 서버에서 폐기되고 시작 화면이 나온다',
  platforms: ['android'],
  precondition: ['로그아웃 확인 창이 떠 있다'],
  params: z.object({}),
  expected: null,
});

const 계정삭제웹 = defineCase({
  tcId: 'MTA-FN-697',
  name: '「계정 삭제」를 누르면 앱 안 웹 화면으로 https://mastodon.maxihan.com/settings/delete 가 열린다',
  platforms: ['android'],
  precondition: ['계정 설정이 열려 있다'],
  held: '보류 — 다른 앱 로그인 — 링크가 Chrome 으로 열리고 Chrome 첫 화면이 구글 계정 로그인을 묻는다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-055',
  name: '계정 설정',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [계정설정열림, 계정설정항목, 이미이계정, 프라이버시스위치, 검색허용바꾸기, 서버소개열기, 로그아웃창, 로그아웃실행, 계정삭제웹],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 프라이버시 = new 프라이버시설정화면(driver);
  let 나: 계정 | undefined;
  let 처음검색허용: boolean | undefined;

  await test.cleanup('바꾼 프라이버시 설정을 되돌린다', async () => {
    if (나 === undefined || 처음검색허용 === undefined) return;
    if ((await 검색허용읽기(나)) !== 처음검색허용) await 계정설정바꾸기(나, { indexable: 처음검색허용 });
  });

  await test.case(계정설정열림, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 내 프로필 메뉴를 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await new 하단탭(driver).누르기('프로필');
      const 프로필 = new 프로필화면(driver);
      await verify('내 프로필 화면이 보인다', await 프로필.떴나(), true, { blocker: true });
      await 프로필.메뉴열기();
    });
    await test.step('내 프로필 메뉴에서 「계정 설정」을 누른다', async () => {
      await new 펼친메뉴(driver).항목누르기('계정 설정');
      await verify('내 프로필 메뉴 「계정 설정」을 누르면 제목 「@qa_user1@mastodon.maxihan.com」 계정 설정이 열린다', await 계정설정.제목글(), expected.제목);
    });
  });

  await test.case(계정설정항목, async () => {
    await test.step('항목을 보려고 계정 설정이 열려 있는지 확인한다', async () => {
      if (!(await 계정설정.떴나(3_000))) await 계정설정열기(driver);
    });
    await test.step('계정 설정 항목을 확인한다', async () => {
      const 프라이버시줄 = await verify('계정 설정에 「프라이버시와 노출 범위」가 보인다', await 굴려서줄있나(driver, '프라이버시와 노출 범위'), true);
      const 필터줄 = await verify('계정 설정에 「필터」가 보인다', await 굴려서줄있나(driver, '필터'), true);
      const 알림줄 = await verify('계정 설정에 「알림」이 보인다', await 굴려서줄있나(driver, '알림'), true);
      const 기본값줄 = await verify('계정 설정에 「게시 기본값」이 보인다', await 굴려서줄있나(driver, '게시 기본값'), true);
      const 서버줄 = await verify('계정 설정에 「이 서버에 대해서」가 보인다', await 굴려서줄있나(driver, '이 서버에 대해서'), true);
      const 전환줄 = await verify('계정 설정에 「이 계정으로 전환」이 보인다', await 굴려서줄있나(driver, '이 계정으로 전환'), true);
      const 삭제줄 = await verify('계정 설정에 「계정 삭제」가 보인다', await 굴려서줄있나(driver, '계정 삭제'), true);
      const 로그아웃줄 = await verify('계정 설정에 「로그아웃」이 보인다', await 굴려서줄있나(driver, '로그아웃'), true);
      await verify(
        '계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다',
        프라이버시줄 && 필터줄 && 알림줄 && 기본값줄 && 서버줄 && 전환줄 && 삭제줄 && 로그아웃줄,
        true,
      );
    });
  });

  await test.case(이미이계정, async () => {
    await test.step('「이 계정으로 전환」을 확인한다', async () => {
      if (!(await 계정설정.떴나(3_000))) await 계정설정열기(driver);
      await verify('이미 이 계정이면 「이 계정으로 전환」이 꺼져 있다', !(await 줄켜졌나(driver, '이 계정으로 전환')), true);
    });
  });

  await test.case(프라이버시스위치, async () => {
    await test.step('맨 위부터 보이는 계정 설정을 연다', async () => {
      await 계정설정열기(driver);
    });
    await test.step('「프라이버시와 노출 범위」를 연다', async () => {
      await 계정설정.줄누르기('프라이버시와 노출 범위');
      const 화면 = await verify('「프라이버시와 노출 범위」 화면이 보인다', await 프라이버시.떴나(), true);
      const 탐색 = await verify('「탐색 알고리즘에서 프로필과 게시물 우선 노출」 스위치가 보인다', await 줄스위치있나(driver, '탐색 알고리즘에서 프로필과 게시물 우선 노출'), true);
      const 검색 = await verify('「공개 게시물을 검색 결과에 포함시키기」 스위치가 보인다', await 줄스위치있나(driver, '공개 게시물을 검색 결과에 포함시키기'), true);
      await verify(
        '「프라이버시와 노출 범위」에 「탐색 알고리즘에서 프로필과 게시물 우선 노출」 · 「공개 게시물을 검색 결과에 포함시키기」 스위치가 보인다',
        화면 && 탐색 && 검색,
        true,
      );
    });
  });

  await test.case(검색허용바꾸기, async () => {
    await test.step('「프라이버시와 노출 범위」가 열려 있는지 확인한다', async () => {
      if (!(await 프라이버시.떴나(3_000))) await 프라이버시설정열기(driver);
      처음검색허용 = await 검색허용읽기(나!);
    });
    await test.step('「공개 게시물을 검색 결과에 포함시키기」를 바꾸고 나간다', async () => {
      try {
        await 프라이버시.스위치누르기('공개 게시물을 검색 결과에 포함시키기');
        await 프라이버시.위로누르기();
        const 바뀜 = await 될때까지(driver, async () => (await 검색허용읽기(나!)) !== 처음검색허용, 20_000);
        await verify('프라이버시 스위치를 바꾸면 서버 계정 설정 값도 바뀐다', 바뀜, true);
      } finally {
        await 계정설정바꾸기(나!, { indexable: 처음검색허용! });
      }
    });
  });

  await test.case(서버소개열기, async ({ expected }) => {
    await test.step('맨 위부터 보이는 계정 설정을 다시 연다', async () => {
      await 계정설정열기(driver);
    });
    await test.step('「이 서버에 대해서」를 누른다', async () => {
      await 계정설정.줄누르기('이 서버에 대해서');
      const 서버소개 = new 서버소개화면(driver);
      const 화면 = await verify('서버 소개 화면이 보인다', await 서버소개.떴나(), true);
      const 소개탭 = await verify('서버 소개에 「mastodon.maxihan.com에 대해」 탭이 보인다', await 서버소개.탭있나(expected.소개탭), true);
      const 규칙탭 = await verify('서버 소개에 「규칙」 탭이 보인다', await 서버소개.탭있나(expected.규칙탭), true);
      await verify('「이 서버에 대해서」를 누르면 탭 「mastodon.maxihan.com에 대해」 · 「규칙」이 보인다', 화면 && 소개탭 && 규칙탭, true);
    });
  });

  await test.case(로그아웃창, async ({ expected }) => {
    await test.step('로그아웃 줄을 누를 계정 설정을 연다', async () => {
      await 계정설정열기(driver);
    });
    await test.step('「로그아웃」을 누른다', async () => {
      await 계정설정.로그아웃누르기();
      const 창 = 계정설정.로그아웃창();
      const 창뜸 = await verify('로그아웃 확인 창이 보인다', await 창.떴나(), true);
      const 글들 = [await 창.제목글(), await 창.글읽기()];
      const 글 = await verify('로그아웃 확인 창에 계정 이름이 든 글이 보인다', 글들.includes(expected.창글), true);
      const 로그아웃 = await verify('창의 확인 버튼 글이 기대값과 같다', await 창.확인버튼글(), expected.로그아웃);
      const 취소 = await verify('창의 취소 버튼 글이 기대값과 같다', await 창.취소버튼글(), expected.취소);
      await verify(
        '「로그아웃」을 누르면 「@qa_user1@mastodon.maxihan.com 로그아웃?」 창과 「로그아웃」 · 「취소」가 뜬다',
        창뜸 && 글 && 로그아웃 && 취소,
        true,
      );
    });
  });

  await test.case(로그아웃실행, async () => {
    await test.step('로그아웃 확인 창을 띄운다', async () => {
      if (!(await 계정설정.로그아웃창().떴나(2_000))) {
        await 계정설정열기(driver);
        await 계정설정.로그아웃누르기();
      }
    });
    await test.step('로그아웃 창에서 「로그아웃」을 누른다', async () => {
      const 받음 = await 토큰받기(나!.아이디, 나!.암호);
      await 계정설정.로그아웃창().확인누르기();
      const 시작 = await verify('시작 화면이 보인다', await new 시작화면(driver).떴나(), true);
      const 폐기 = await verify('그 계정 토큰이 서버에서 폐기된다', await 될때까지(driver, async () => !(await 토큰살았나(받음.token)), 30_000), true);
      await verify('로그아웃하면 그 계정 토큰이 서버에서 폐기되고 시작 화면이 나온다', 시작 && 폐기, true);
    });
  });

  await test.case(계정삭제웹, async () => {
    await test.step('「계정 삭제」를 누른다', async () => {
      await 계정설정열기(driver);
      await verify('「계정 삭제」를 누르면 앱 안 웹 화면으로 https://mastodon.maxihan.com/settings/delete 가 열린다', await 굴려서줄있나(driver, '계정 삭제'), true);
    });
  });
});
