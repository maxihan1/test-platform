import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 하단탭 } from './components/tabbar.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 고정, 고정해제, 관계보기, 글쓰기, 글읽기, 내글지우기, 내정보, 사람글찾기, 언팔로우, 팔로우 } from './helpers/api.helper.js';
import {
  고정글들,
  더보기열기,
  동작스위치맞추기,
  이름,
  카드글자,
  토스트떴나,
  프로필열고글찾기,
  홈에서글찾기,
} from './helpers/flow-status.helper.js';
import { 글열기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 토스트에글자있나 } from './helpers/system-ui.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 삭제묻기켜짐 = defineCase({
  tcId: 'MTA-FN-193',
  name: '「게시물 삭제 전 묻기」가 켜져 있으면 삭제할 때 「게시물삭제」 / 「정말로 이 게시물을 삭제하시겠습니까?」 / 「삭제」 · 「취소」 확인 창이 뜬다',
  platforms: ['android'],
  precondition: ['「게시물 삭제 전 묻기」가 켜져 있고 내가 쓴 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP019」로 시작하는 500자까지').default('QA TP019 삭제 글'),
  }),
  expected: z.object({
    제목: z.string().describe('확인 창 제목').default('게시물삭제'),
    안내: z.string().describe('확인 창 안내').default('정말로 이 게시물을 삭제하시겠습니까?'),
    확인: z.string().describe('확인 창 확인 버튼').default('삭제'),
    취소: z.string().describe('확인 창 취소 버튼').default('취소'),
  }),
});

const 삭제실행 = defineCase({
  tcId: 'MTA-FN-194',
  name: '삭제 확인 창에서 「삭제」를 누르면 「삭제 중…」 진행 뒤 글이 목록에서 사라진다',
  platforms: ['android'],
  precondition: ['삭제 확인 창이 떠 있다'],
  params: z.object({}),
  expected: null,
});

const 삭제묻기꺼짐 = defineCase({
  tcId: 'MTA-FN-195',
  name: '「게시물 삭제 전 묻기」가 꺼져 있으면 확인 창 없이 글이 지워진다',
  platforms: ['android'],
  precondition: ['「게시물 삭제 전 묻기」를 껐고 내가 쓴 글이 있다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP019」로 시작하는 500자까지').default('QA TP019 묻지 않고 삭제할 글'),
  }),
  expected: null,
});

const 고정안내 = defineCase({
  tcId: 'MTA-FN-197',
  name: '글을 고정하면 스낵바 「게시물이 고정되었습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['내가 쓴 공개 글이 있다', '그 글이 고정돼 있다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP019」로 시작하는 500자까지').default('QA TP019 고정할 글'),
  }),
  expected: null,
});

const 언팔로우묻기 = defineCase({
  tcId: 'MTA-FN-196',
  name: '「누군가를 언팔로우할 때 묻기」가 켜져 있으면 「cafe_moon 님을 언팔로우 할까요?」 확인 창이 뜬다',
  platforms: ['android'],
  precondition: ['「누군가를 언팔로우할 때 묻기」가 켜져 있고 cafe_moon 을 팔로우했다', '「누군가를 언팔로우할 때 묻기」가 꺼져 있고 cafe_moon 을 팔로우했다'],
  params: z.object({}),
  expected: z.object({ 안내: z.string().describe('언팔로우 확인 창 안내').default('cafe_moon 님을 언팔로우 할까요?') }),
});

const 고정다섯개 = defineCase({
  tcId: 'MTA-FN-199',
  name: '고정 글이 5개면 내 프로필에 고정 글 5개가 남아 있다',
  platforms: ['android'],
  precondition: ['내 고정 글이 5개다'],
  techniques: ['경계값 분석'],
  params: z.object({
    여섯째본문: z.string().min(1).max(500).describe('여섯 번째로 고정해 볼 글 — 「QA TP019」로 시작하는 500자까지').default('QA TP019 여섯째 고정 글'),
  }),
  expected: z.object({ 고정수: z.number().describe('고정할 수 있는 글 수').default(5) }),
});

const 인용제거확인 = defineCase({
  tcId: 'MTA-FN-200',
  name: '인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 / 「이 작업은 되돌릴 수 없습니다.」 / 「게시물 삭제」 확인 창이 뜬다',
  platforms: ['android'],
  precondition: ['jiho_cafe 가 내 글을 인용한 글이 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('확인 창 제목').default('게시물을 삭제하시겠습니까?'),
    안내: z.string().describe('확인 창 안내').default('이 작업은 되돌릴 수 없습니다.'),
    확인: z.string().describe('확인 창 확인 버튼').default('게시물 삭제'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-019',
  name: '글 삭제 · 고정 · 언팔로우 묻기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [삭제묻기켜짐, 삭제실행, 삭제묻기꺼짐, 언팔로우묻기, 고정다섯개, 인용제거확인, 고정안내],
});

const 삭제묻기줄 = '게시물 삭제 전 묻기';
const 언팔로우묻기줄 = '누군가를 언팔로우할 때 묻기';

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;
  let 나사용자명 = '';
  let 삭제글자 = '';

  const 글올리고홈에서찾기 = async (본문: string): Promise<void> => {
    await 글쓰기(나!, 본문);
    await 홈에들어가기(driver);
    await verify('홈 맨 위에 내 글이 보인다', await 홈.새로고침해맨위에올때까지(본문), true, { blocker: true });
  };

  await test.cleanup('이 흐름이 바꾼 설정 · 팔로우 · 글을 되돌린다', async () => {
    if (나 === undefined) return;
    await 내글지우기(나, 'QA TP019');
    await 언팔로우(나, 'cafe_moon');
    await 동작스위치맞추기(driver, 삭제묻기줄, true);
    await 동작스위치맞추기(driver, 언팔로우묻기줄, false);
  });

  await test.case(삭제묻기켜짐, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    삭제글자 = params.본문;
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      나사용자명 = (await 내정보(나!)).username;
      await 내글지우기(나!, 'QA TP019');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('「게시물 삭제 전 묻기」를 켜고 API 로 내 글을 올린다', async () => {
      await 동작스위치맞추기(driver, 삭제묻기줄, true);
      await 글올리고홈에서찾기(params.본문);
    });
    await test.step('내 글 더보기에서 「삭제」를 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, params.본문);
      await 메뉴열림.항목누르기('삭제');
      const 떴다 = await verify('확인 창이 뜬다', await 창.떴나(), true);
      const 제목 = await verify('확인 창 제목이 「게시물삭제」다', await 창.제목글(), expected.제목);
      const 안내 = await verify('확인 창에 「정말로 이 게시물을 삭제하시겠습니까?」가 보인다', await 창.글읽기(), expected.안내);
      const 확인 = await verify('확인 창에 「삭제」가 보인다', await 창.확인버튼글(), expected.확인);
      const 취소 = await verify('확인 창에 「취소」가 보인다', await 창.취소버튼글(), expected.취소);
      await verify(
        '「게시물 삭제 전 묻기」가 켜져 있으면 삭제할 때 「게시물삭제」 / 「정말로 이 게시물을 삭제하시겠습니까?」 / 「삭제」 · 「취소」 확인 창이 뜬다',
        떴다 && 제목 && 안내 && 확인 && 취소,
        true,
      );
    });
  });

  await test.case(삭제실행, async () => {
    await test.step('삭제 확인 창이 떠 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 창.떴나(2_000))) {
        await 홈에들어가기(driver);
        await 홈에서글찾기(driver, 삭제글자);
        const 메뉴열림 = await 더보기열기(driver, 삭제글자);
        await 메뉴열림.항목누르기('삭제');
        if (!(await 창.떴나(10_000))) throw new Error('삭제 확인 창이 안 떴다');
      }
    });
    await test.step('삭제 확인 창에서 「삭제」를 누른다', async () => {
      await 창.확인누르기();
      await verify('삭제 확인 창에서 「삭제」를 누르면 「삭제 중…」 진행 뒤 글이 목록에서 사라진다', await 사라질때까지(driver, 글카드.본문(삭제글자), 20_000), true);
    });
  });

  await test.case(삭제묻기꺼짐, async ({ params }) => {
    await test.step('「게시물 삭제 전 묻기」를 끄고 API 로 내 글을 올린다', async () => {
      await 동작스위치맞추기(driver, 삭제묻기줄, false);
      await 글올리고홈에서찾기(params.본문);
    });
    await test.step('묻기를 끈 채 내 글 「삭제」를 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, params.본문);
      await 메뉴열림.항목누르기('삭제');
      const 창없음 = await verify('확인 창이 뜨지 않는다', await 창.떴나(3_000), false);
      const 사라짐 = await verify('글이 목록에서 사라진다', await 사라질때까지(driver, 글카드.본문(params.본문), 20_000), true);
      await verify('「게시물 삭제 전 묻기」가 꺼져 있으면 확인 창 없이 글이 지워진다', 창없음 && 사라짐, true);
    });
    await test.step('꺼 둔 「게시물 삭제 전 묻기」를 다시 켠다', async () => {
      await 동작스위치맞추기(driver, 삭제묻기줄, true);
    });
  });

  await test.case(언팔로우묻기, async ({ expected }) => {
    const 카페글 = await 사람글찾기(나!, 'cafe_moon', (x) => x.reblog === null, 'cafe_moon 글');
    const 카페이름 = 이름(카페글.account);
    await test.step('「누군가를 언팔로우할 때 묻기」를 켜고 cafe_moon 을 팔로우한다', async () => {
      await 팔로우(나!, 'cafe_moon');
      await 동작스위치맞추기(driver, 언팔로우묻기줄, true);
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'cafe_moon', 카드글자(카페글));
    });
    await test.step('cafe_moon 글 더보기에서 「팔로우 해제」를 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, 카드글자(카페글));
      await 메뉴열림.항목누르기(`${카페이름} 팔로우 해제`);
      await verify('「누군가를 언팔로우할 때 묻기」가 켜져 있으면 「cafe_moon 님을 언팔로우 할까요?」 확인 창이 뜬다', (await 창.글읽기()).includes(expected.안내), true);
      await 창.취소누르기();
    });
    await test.step('「누군가를 언팔로우할 때 묻기」를 끄고 cafe_moon 글 카드를 다시 연다', async () => {
      await 동작스위치맞추기(driver, 언팔로우묻기줄, false);
      await new 하단탭(driver).누르기('둘러보기');
      if (!(await 될때까지(driver, () => new 글카드(driver).보이나(카드글자(카페글)), 5_000))) {
        await 홈에들어가기(driver);
        await 프로필열고글찾기(driver, 'cafe_moon', 카드글자(카페글));
      }
    });
    await test.step('묻기를 끈 채 「팔로우 해제」를 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, 카드글자(카페글));
      await 메뉴열림.항목누르기(`${카페이름} 팔로우 해제`);
      const 창없음 = await verify('확인 창이 뜨지 않는다', await 창.떴나(3_000), false);
      const 풀림 = await verify('cafe_moon 팔로우가 풀린다', !(await 관계보기(나!, 'cafe_moon')).following, true);
      await verify('「누군가를 언팔로우할 때 묻기」를 끈 채로는 확인 창 없이 팔로우가 풀린다', 창없음 && 풀림, true);
    });
  });

  await test.case(고정다섯개, async ({ params, expected }) => {
    let 여섯째id = '';
    await test.step('API 로 내 고정 글을 5개로 맞춘다', async () => {
      const 이미 = (await 고정글들(나!, 나사용자명)).length;
      for (let 번 = 0; 번 < expected.고정수 - 이미; 번++) {
        const 올린글 = await 글쓰기(나!, `QA TP019 고정 글 ${String(번 + 1)}`);
        await 고정(나!, 올린글.id);
      }
      await verify('내 고정 글이 5개다', (await 고정글들(나!, 나사용자명)).length, expected.고정수, { blocker: true });
    });
    await test.step('고정 글 5개를 확인한다', async () => {
      await verify('고정 글이 5개면 내 프로필에 고정 글 5개가 남아 있다', (await 고정글들(나!, 나사용자명)).length, expected.고정수);
    });
    await test.step('API 로 여섯 번째 글을 올린다', async () => {
      여섯째id = (await 글쓰기(나!, params.여섯째본문)).id;
      await 홈에들어가기(driver);
      await verify('홈 맨 위에 여섯 번째 글이 보인다', await 홈.새로고침해맨위에올때까지(params.여섯째본문), true, { blocker: true });
    });
    await test.step('6번째 글을 「프로필에 고정」한다', async () => {
      const 메뉴열림 = await 더보기열기(driver, params.여섯째본문);
      await 메뉴열림.항목누르기('프로필에 고정');
      const 오류 = await verify('오류가 보인다', await 토스트떴나(driver, 8_000), true);
      const 안고정 = await verify('6번째 글은 고정되지 않는다', Boolean((await 글읽기(나!, 여섯째id)).pinned), false);
      await verify('고정 글이 5개일 때 6번째 글 고정은 오류가 보이고 고정되지 않는다', 오류 && 안고정, true);
    });
  });

  await test.case(인용제거확인, async ({ expected }) => {
    const 인용글 = await 사람글찾기(나!, 'jiho_cafe', (x) => x.reblog === null && x.quote?.quoted_status?.account.username === 'qa_user1', '내 글을 인용한');
    await test.step('jiho_cafe 프로필에서 내 글을 인용한 글 카드를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await 글열기(driver, 인용글);
    });
    await test.step('인용 제거 항목을 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, 카드글자(인용글));
      const 항목 = await verify('더보기에 「jiho_cafe의 게시물에서 나의 게시물을 제거합니다」 항목이 보인다', await 메뉴열림.항목있나('jiho_cafe의 게시물에서 나의 게시물을 제거합니다'), true);
      if (항목) await 메뉴열림.항목누르기('jiho_cafe의 게시물에서 나의 게시물을 제거합니다');
      else await 메뉴열림.닫기();
      const 제목 = await verify('확인 창 제목이 「게시물을 삭제하시겠습니까?」다', await 창.제목글(), expected.제목);
      const 안내 = await verify('확인 창에 「이 작업은 되돌릴 수 없습니다.」가 보인다', await 창.글읽기(), expected.안내);
      const 확인 = await verify('확인 창에 「게시물 삭제」가 보인다', 항목 ? await 창.확인버튼글() : '', expected.확인);
      await verify(
        '인용 제거를 누르면 「게시물을 삭제하시겠습니까?」 / 「이 작업은 되돌릴 수 없습니다.」 / 「게시물 삭제」 확인 창이 뜬다',
        항목 && 제목 && 안내 && 확인,
        true,
      );
      if (항목) await 창.취소누르기();
    });
  });

  await test.case(고정안내, async ({ params }) => {
    await test.step('API 로 고정할 내 글을 올린다', async () => {
      for (const 고정글 of await 고정글들(나!, 나사용자명)) await 고정해제(나!, 고정글.id);
      await 글올리고홈에서찾기(params.본문);
    });
    await test.step('내 글 더보기에서 「프로필에 고정」을 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, params.본문);
      await 메뉴열림.항목누르기('프로필에 고정');
      await verify('글을 고정하면 스낵바 「게시물이 고정되었습니다.」가 보인다', await 토스트에글자있나(driver, '게시물이 고정되었습니다.', 8_000), true);
    });
    await test.step('내 글 더보기에서 「프로필에서 고정 해제」를 누른다', async () => {
      const 메뉴열림 = await 더보기열기(driver, params.본문);
      await 메뉴열림.항목누르기('프로필에서 고정 해제');
      await verify('고정 해제 뒤 스낵바 「게시물 고정이 해제되었습니다.」가 보인다', await 토스트에글자있나(driver, '게시물 고정이 해제되었습니다.', 8_000), true);
    });
  });
});
