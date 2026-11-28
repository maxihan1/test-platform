import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 토큰없이부르기, 해시태그팔로우 } from './helpers/api.helper.js';
import { 창에글있나 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 확인창 } from './components/dialog.component.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';
import { 해시태그화면 } from './pages/hashtag.page.js';
import { 홈화면 } from './pages/home.page.js';

const 드롭다운에서열기 = defineCase({
  tcId: 'MTA-FN-355',
  name: '홈 드롭다운에서 해시태그를 누르면 해시태그 타임라인이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 #카페 를 팔로우 중이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    태그: z.string().min(1).describe('열어 볼 해시태그 — # 없이, 일반 회원이 팔로우 중인 태그').default('카페'),
  }),
  expected: null,
});

const 타임라인머리 = defineCase({
  tcId: 'MTA-UI-296',
  name: '해시태그 타임라인에 제목 「#카페」 · 지난 일주일 요약 「게시물 n개」 · 「n명의 참여자」 · 「오늘 게시한 n명」 · 「팔로잉」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['#카페 해시태그 타임라인이 열려 있다'],
  params: z.object({ 태그: z.string().min(1).describe('열어 볼 해시태그 — # 없이, 일반 회원이 팔로우 중인 태그').default('카페') }),
  expected: z.object({ 버튼: z.string().describe('팔로우 중인 태그의 버튼 글').default('팔로잉') }),
});

const 새글이홈에 = defineCase({
  tcId: 'MTA-FN-358',
  name: '팔로우한 해시태그 「#오늘의사진」 글이 올라오면 홈에 섞여 보인다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 「#오늘의사진」이 든 글을 올렸다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP039」로 시작하고 #오늘의사진 이 든 글').default('QA TP039 #오늘의사진 새로고침'),
  }),
  expected: null,
});

const 로그인없이피드 = defineCase({
  tcId: 'MTA-FN-359',
  name: '로그인 없이 해시태그 피드를 부르면 200 응답으로 글 목록이 온다',
  platforms: ['android'],
  precondition: ['대상 서버 주소가 있다'],
  params: z.object({ 태그: z.string().min(1).describe('피드를 부를 해시태그 — # 없이, 글이 있는 태그').default('카페') }),
  expected: z.object({ 코드: z.number().describe('응답 코드').default(200) }),
});

const 관리줄 = defineCase({
  tcId: 'MTA-UI-300',
  name: '해시태그 관리 화면(제목 「해시태그 관리」) 줄마다 #태그 · 「n 개 최신 게시물」 · 해제 버튼이 보인다',
  platforms: ['android'],
  precondition: ['해시태그 관리 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 제목: z.string().describe('해시태그 관리 화면 제목').default('해시태그 관리') }),
});

const 해제묻기 = defineCase({
  tcId: 'MTA-FN-361',
  name: '해시태그 관리 해제 버튼을 누르면 「#카페 님을 언팔로우 할까요?」 창과 「팔로우 해제」 · 「취소」가 뜬다',
  platforms: ['android'],
  held: '보류 — Can not call getText on element with selector "id=android:id/button1" because element was not found',
  precondition: ['해시태그 관리 화면이 열려 있다'],
  params: z.object({ 태그: z.string().min(1).describe('해제 버튼을 누를 해시태그 — # 없이, 일반 회원이 팔로우 중인 태그').default('카페') }),
  expected: z.object({
    확인: z.string().describe('해제 확인 버튼 글').default('팔로우 해제'),
    취소: z.string().describe('해제 취소 버튼 글').default('취소'),
  }),
});

const 줄누르기 = defineCase({
  tcId: 'MTA-FN-362',
  name: '해시태그 관리 줄을 누르면 해시태그 타임라인이 열린다',
  platforms: ['android'],
  precondition: ['해시태그 관리 화면이 열려 있다'],
  params: z.object({ 태그: z.string().min(1).describe('눌러 볼 줄의 해시태그 — # 없이, 일반 회원이 팔로우 중인 태그').default('오늘의사진') }),
  expected: null,
});

const 팔로우다시 = defineCase({
  tcId: 'MTA-FN-357',
  name: '해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「# 카페 팔로우 해제」로 바뀐다',
  platforms: ['android'],
  precondition: ['#카페 를 팔로우 중이다'],
  params: z.object({ 태그: z.string().min(1).describe('팔로우를 풀었다 다시 걸 해시태그 — # 없이').default('카페') }),
  expected: z.object({
    버튼: z.string().describe('다시 팔로우한 뒤 버튼 글').default('팔로잉'),
    메뉴: z.string().describe('다시 팔로우한 뒤 메뉴 항목').default('# 카페 팔로우 해제'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-039',
  name: '해시태그 타임라인',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [드롭다운에서열기, 타임라인머리, 새글이홈에, 로그인없이피드, 관리줄, 줄누르기, 팔로우다시, 해제묻기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 태그화면 = new 해시태그화면(driver);
  const 관리 = new 해시태그관리화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  await test.cleanup('이 흐름이 올린 글을 지우고 해시태그 팔로우를 되돌린다', async () => {
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP039');
    if (나 !== undefined) {
      await 해시태그팔로우(나, '카페', true);
      await 해시태그팔로우(나, '오늘의사진', true);
    }
  });

  await test.case(드롭다운에서열기, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 해시태그팔로우(나!, params.태그, true);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('홈 드롭다운 「팔로우 중인 해시태그」에서 「#카페」를 누른다', async () => {
      await 태그화면.홈드롭다운에서열기(params.태그);
      await verify('홈 드롭다운에서 해시태그를 누르면 해시태그 타임라인이 열린다', await 태그화면.떴나(), true);
    });
  });

  await test.case(타임라인머리, async ({ params, expected }) => {
    await test.step('해시태그 타임라인 머리를 확인한다', async () => {
      await 홈에들어가기(driver);
      await 태그화면.홈드롭다운에서열기(params.태그);
      const 요약 = await 태그화면.요약글();
      const 제목 = await verify('해시태그 타임라인 제목이 「#카페」다', await 태그화면.제목글(), `#${params.태그}`);
      const 게시물수 = await verify('지난 일주일 요약에 「게시물 n개」가 보인다', /게시물 \d+개/.test(요약), true);
      const 참여자수 = await verify('지난 일주일 요약에 「n명의 참여자」가 보인다', /\d+명의 참여자/.test(요약), true);
      const 오늘수 = await verify('지난 일주일 요약에 「오늘 게시한 n명」이 보인다', /오늘 게시한 \d+명/.test(요약), true);
      const 버튼 = await verify('해시태그 버튼이 「팔로잉」이다', await 태그화면.버튼글(), expected.버튼);
      await verify(
        '해시태그 타임라인에 제목 「#카페」 · 지난 일주일 요약 「게시물 n개」 · 「n명의 참여자」 · 「오늘 게시한 n명」 · 「팔로잉」 버튼이 보인다',
        제목 && 게시물수 && 참여자수 && 오늘수 && 버튼,
        true,
      );
    });
  });

  await test.case(새글이홈에, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 해시태그 글을 올린다', async () => {
      await 내글지우기(둘째!, 'QA TP039');
      await 해시태그팔로우(나!, '오늘의사진', true);
      await 글쓰기(둘째!, params.본문);
      await 홈에들어가기(driver);
    });
    await test.step('홈을 당겨서 새로고침해 그 글을 찾는다', async () => {
      await verify('팔로우한 해시태그 「#오늘의사진」 글이 올라오면 홈에 섞여 보인다', await 홈.새로고침해맨위에올때까지(params.본문), true);
    });
  });

  await test.case(로그인없이피드, async ({ params, expected }) => {
    await test.step('로그인 없이 #카페 해시태그 피드 API 를 부른다', async () => {
      const 답 = await 토큰없이부르기(`/api/v1/timelines/tag/${encodeURIComponent(params.태그)}`);
      const 코드 = await verify('응답 코드가 기대값과 같다', 답.코드, expected.코드);
      const 목록 = await verify('응답 본문에 글이 하나 이상 든 목록이 있다', Array.isArray(답.본문) && 답.본문.length > 0, true);
      await verify('로그인 없이 해시태그 피드를 부르면 200 응답으로 글 목록이 온다', 코드 && 목록, true);
    });
  });

  await test.case(관리줄, async ({ expected }) => {
    await test.step('해시태그 관리 줄을 확인한다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      const 이름들 = await 관리.줄이름글들();
      const 요약들 = await 관리.줄요약글들();
      let 줄마다버튼 = 이름들.length > 0;
      for (const 이름 of 이름들) if ((await 관리.줄버튼설명(이름)) === '') 줄마다버튼 = false;
      const 제목 = await verify('해시태그 관리 화면 제목이 기대값과 같다', await 관리.위막대제목글(), expected.제목);
      const 태그표기 = await verify('줄마다 #태그가 보인다', 이름들.length > 0 && 이름들.every((글) => 글.startsWith('#')), true);
      const 최신수 = await verify('줄마다 「n 개 최신 게시물」이 보인다', 요약들.length > 0 && 요약들.every((글) => /^\d+ 개 최신 게시물$/.test(글)), true);
      const 해제버튼 = await verify('줄마다 해제 버튼이 보인다', 줄마다버튼, true);
      await verify('해시태그 관리 화면(제목 「해시태그 관리」) 줄마다 #태그 · 「n 개 최신 게시물」 · 해제 버튼이 보인다', 제목 && 태그표기 && 최신수 && 해제버튼, true);
    });
  });

  await test.case(줄누르기, async ({ params }) => {
    await test.step('해시태그 관리에서 「#오늘의사진」 줄을 누른다', async () => {
      await 해시태그팔로우(나!, params.태그, true);
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄누르기(params.태그);
      await verify('해시태그 관리 줄을 누르면 해시태그 타임라인이 열린다', await 태그화면.떴나(), true);
    });
  });

  await test.case(팔로우다시, async ({ params, expected }) => {
    await test.step('#카페 를 팔로우한 채 해시태그 타임라인을 연다', async () => {
      await 해시태그팔로우(나!, params.태그, true);
      await 홈에들어가기(driver);
      await 태그화면.검색으로열기(params.태그);
      if (!(await 태그화면.버튼글될때까지('팔로잉'))) throw new Error(`#${params.태그} 버튼이 「팔로잉」이 아니다`);
    });
    await test.step('해시태그 「팔로잉」을 눌러 풀고 「팔로우」를 다시 누른다', async () => {
      await 태그화면.버튼누르기();
      if (!(await 태그화면.버튼글될때까지('팔로우'))) throw new Error(`#${params.태그} 팔로우가 안 풀렸다`);
      await 태그화면.버튼누르기();
      const 버튼 = await verify('버튼이 「팔로잉」으로 바뀐다', await 태그화면.버튼글될때까지(expected.버튼), true);
      const 메뉴 = await verify('메뉴에 「# 카페 팔로우 해제」가 보인다', await 태그화면.메뉴항목있나(expected.메뉴), true);
      await verify('해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「# 카페 팔로우 해제」로 바뀐다', 버튼 && 메뉴, true);
    });
  });

  await test.case(해제묻기, async ({ params, expected }) => {
    await test.step('「#카페」 줄의 해제 버튼을 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄버튼누르기(params.태그);
      const 창 = new 확인창(driver);
      const 떴다 = await verify('확인 창이 뜬다', await 창.떴나(), true);
      const 묻는글 = await verify('창에 「#카페 님을 언팔로우 할까요?」가 보인다', await 창에글있나(창, `#${params.태그} 님을 언팔로우 할까요?`), true);
      const 확인글 = await verify('창의 확인 버튼이 「팔로우 해제」다', await 창.확인버튼글(), expected.확인);
      const 취소글 = await verify('창의 취소 버튼이 「취소」다', await 창.취소버튼글(), expected.취소);
      await verify(
        '해시태그 관리 해제 버튼을 누르면 「#카페 님을 언팔로우 할까요?」 창과 「팔로우 해제」 · 「취소」가 뜬다',
        떴다 && 묻는글 && 확인글 && 취소글,
        true,
      );
      await 창.취소누르기();
    });
  });
});
