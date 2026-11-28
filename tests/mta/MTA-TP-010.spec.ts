import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 앱다시켜기, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 마커읽기, 목록홈숨김 } from './helpers/api.helper.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 필터키워드, 홈다시열기, 홈에서드롭다운열기 } from './helpers/flow-start.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 다시켜도홈 = defineCase({
  tcId: 'MTA-FN-008',
  name: '계정이 있으면 앱을 켤 때 마지막으로 쓴 계정의 홈이 바로 나온다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 홈에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 드롭다운항목 = defineCase({
  tcId: 'MTA-UI-008',
  name: '홈 상단 드롭다운에 「홈」 · 「실시간 피드」 · 「목록」 · 「팔로우 중인 해시태그」가 보인다',
  platforms: ['android'],
  precondition: ['홈에 있다'],
  params: z.object({}),
  expected: null,
});

const 실시간항목 = defineCase({
  tcId: 'MTA-UI-120',
  name: '라이브 피드를 공개한 우리 서버의 홈 드롭다운에 「실시간 피드」 항목이 보인다',
  platforms: ['android'],
  precondition: ['홈 드롭다운이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 실시간배너 = defineCase({
  tcId: 'MTA-FN-132',
  name: '홈 드롭다운에서 「실시간 피드」를 고르면 안내 배너 「이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['홈 드롭다운이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 배너: z.string().describe('안내 배너 글').default('이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.') }),
});

const 목록하위 = defineCase({
  tcId: 'MTA-UI-108',
  name: '홈 드롭다운 「목록」 하위에 「개발 소식」 · 「친구」가 가나다 순으로 보이고 「목록 만들기」 · 「목록 관리」가 보인다',
  platforms: ['android'],
  precondition: ['목록 「개발 소식」 · 「친구」가 있다'],
  params: z.object({}),
  expected: null,
});

const 해시태그하위 = defineCase({
  tcId: 'MTA-UI-110',
  name: '홈 드롭다운 「팔로우 중인 해시태그」 하위에 「#오늘의사진」 · 「#카페」와 「해시태그 관리」가 보인다',
  platforms: ['android'],
  precondition: ['해시태그 #오늘의사진 · #카페를 팔로우 중이다'],
  params: z.object({}),
  expected: null,
});

const 목록관리아이콘 = defineCase({
  tcId: 'MTA-FN-138',
  name: '목록 「개발 소식」을 보는 중이면 설정 아이콘 옆에 「목록 관리」 아이콘이 같이 보인다',
  platforms: ['android'],
  precondition: ['목록 「개발 소식」이 있다'],
  params: z.object({ 목록이름: z.string().min(1).describe('고를 목록 이름 — 일반 회원에게 있는 목록').default('개발 소식') }),
  expected: null,
});

const 읽음마커 = defineCase({
  tcId: 'MTA-FN-144',
  name: '홈 탭이 가려지면 읽던 맨 위 글 위치가 서버 홈 읽음 위치(마커)에 저장된다',
  platforms: ['android'],
  precondition: ['홈에 글이 여럿 보인다'],
  params: z.object({}),
  expected: null,
});

const 새게시물버튼 = defineCase({
  tcId: 'MTA-FN-140',
  name: '새 글이 들어오면 위에 「새 게시물」 버튼이 나타나고 누르면 맨 위로 이동한다',
  platforms: ['android'],
  precondition: ['홈을 아래로 내려 두었고 내가 새 글을 서버에 올렸다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP010」으로 시작').default('QA TP010 새 게시물') }),
  expected: null,
});

const 필터글숨김 = defineCase({
  tcId: 'MTA-FN-143',
  name: '홈을 새로고침하면 필터 「광고」에 걸린 글이 홈에 보이지 않는다',
  platforms: ['android'],
  precondition: ['필터 「광고」(숨기기)에 걸리는 글을 내가 팔로우한 두 번째 사용자가 올렸다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    필터이름: z.string().min(1).describe('필터 이름 — 일반 회원에게 있는 숨기기 필터').default('광고'),
    통과글: z.string().min(1).max(500).describe('필터에 안 걸리는 글 — 「QA TP010」으로 시작').default('QA TP010 통과'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-010',
  name: '홈 드롭다운과 피드',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [다시켜도홈, 드롭다운항목, 실시간항목, 실시간배너, 목록하위, 해시태그하위, 목록관리아이콘, 읽음마커, 새게시물버튼, 필터글숨김],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 탭 = new 하단탭(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;

  let 숨김끔 = false;

  await test.cleanup('이 흐름이 올린 글을 지우고 「친구」 목록 홈 숨김을 되돌린다', async () => {
    if (나 !== undefined && 숨김끔) await 목록홈숨김(나, '친구', true);
    if (나 !== undefined) await 내글지우기(나, 'QA TP010');
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP010');
  });

  await test.case(다시켜도홈, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('앱을 껐다가 다시 켠다', async () => {
      await 앱다시켜기(driver, 꾸러미);
      await verify('계정이 있으면 앱을 켤 때 마지막으로 쓴 계정의 홈이 바로 나온다', await 홈.떴나(30_000), true);
    });
  });

  await test.case(드롭다운항목, async () => {
    await test.step('홈 상단 드롭다운을 연다', async () => {
      await 홈에서드롭다운열기(driver);
      const 홈항목 = await verify('드롭다운에 「홈」이 보인다', await 홈.드롭다운항목있나('홈'), true);
      const 실시간 = await verify('드롭다운에 「실시간 피드」가 보인다', await 홈.드롭다운항목있나('실시간 피드'), true);
      const 목록 = await verify('드롭다운에 「목록」이 보인다', await 홈.드롭다운항목있나('목록'), true);
      const 해시태그 = await verify('드롭다운에 「팔로우 중인 해시태그」가 보인다', await 홈.드롭다운항목있나('팔로우 중인 해시태그'), true);
      await verify('홈 상단 드롭다운에 「홈」 · 「실시간 피드」 · 「목록」 · 「팔로우 중인 해시태그」가 보인다', 홈항목 && 실시간 && 목록 && 해시태그, true);
    });
  });

  await test.case(실시간항목, async () => {
    await test.step('드롭다운의 「실시간 피드」 항목을 확인한다', async () => {
      await 홈에서드롭다운열기(driver);
      await verify('라이브 피드를 공개한 우리 서버의 홈 드롭다운에 「실시간 피드」 항목이 보인다', await 홈.드롭다운항목있나('실시간 피드'), true);
    });
  });

  await test.case(실시간배너, async ({ expected }) => {
    await test.step('드롭다운에서 「실시간 피드」를 고른다', async () => {
      await 홈다시열기(driver);
      await 홈.실시간피드고르기();
      await verify('홈 드롭다운에서 「실시간 피드」를 고르면 안내 배너 「이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.」가 보인다', await 홈.실시간배너글(), expected.배너);
    });
  });

  await test.case(목록하위, async () => {
    await test.step('드롭다운에서 「목록」 하위를 연다', async () => {
      await 홈에서드롭다운열기(driver);
      await 홈.드롭다운하위열기('목록');
      const 개발 = await verify('「목록」 하위에 「개발 소식」이 보인다', await 홈.드롭다운항목있나('개발 소식'), true);
      const 친구 = await verify('「목록」 하위에 「친구」가 보인다', await 홈.드롭다운항목있나('친구'), true);
      const 글들 = await 홈.드롭다운글들();
      const 순서 = await verify('「개발 소식」이 「친구」보다 앞에 보인다', 글들.indexOf('개발 소식') >= 0 && 글들.indexOf('개발 소식') < 글들.indexOf('친구'), true);
      const 만들기 = await verify('「목록」 하위에 「목록 만들기」가 보인다', await 홈.드롭다운항목있나('목록 만들기'), true);
      const 관리 = await verify('「목록」 하위에 「목록 관리」가 보인다', await 홈.드롭다운항목있나('목록 관리'), true);
      await verify('홈 드롭다운 「목록」 하위에 「개발 소식」 · 「친구」가 가나다 순으로 보이고 「목록 만들기」 · 「목록 관리」가 보인다', 개발 && 친구 && 순서 && 만들기 && 관리, true);
    });
  });

  await test.case(해시태그하위, async () => {
    await test.step('드롭다운에서 「팔로우 중인 해시태그」 하위를 연다', async () => {
      await 홈에서드롭다운열기(driver);
      await 홈.드롭다운하위열기('팔로우 중인 해시태그');
      const 사진 = await verify('「팔로우 중인 해시태그」 하위에 「#오늘의사진」이 보인다', await 홈.드롭다운항목있나('#오늘의사진'), true);
      const 카페 = await verify('「팔로우 중인 해시태그」 하위에 「#카페」가 보인다', await 홈.드롭다운항목있나('#카페'), true);
      const 관리 = await verify('「팔로우 중인 해시태그」 하위에 「해시태그 관리」가 보인다', await 홈.드롭다운항목있나('해시태그 관리'), true);
      await verify('홈 드롭다운 「팔로우 중인 해시태그」 하위에 「#오늘의사진」 · 「#카페」와 「해시태그 관리」가 보인다', 사진 && 카페 && 관리, true);
    });
  });

  await test.case(목록관리아이콘, async ({ params }) => {
    await test.step('드롭다운에서 목록 「개발 소식」을 고른다', async () => {
      await 홈다시열기(driver);
      await 홈.목록고르기(params.목록이름);
      const 관리 = await verify('「목록 관리」 아이콘이 보인다', await 홈.목록관리아이콘있나(), true);
      const 설정 = await verify('설정 아이콘이 보인다', await 홈.떴나(), true);
      await verify('목록 「개발 소식」을 보는 중이면 설정 아이콘 옆에 「목록 관리」 아이콘이 같이 보인다', 관리 && 설정, true);
    });
  });

  await test.case(읽음마커, async () => {
    await test.step('홈 목록을 내린 뒤 「알림」 탭으로 옮긴다', async () => {
      await 홈다시열기(driver);
      const 전 = await 마커읽기(나!, 'home');
      await 홈.아래로내리기(3);
      await 탭.누르기('알림');
      const 저장됨 = await 될때까지(
        driver,
        async () => {
          const 후 = await 마커읽기(나!, 'home');
          return 후 !== undefined && (후.last_read_id !== 전?.last_read_id || 후.updated_at !== 전?.updated_at);
        },
        30_000,
      );
      await verify('홈 탭이 가려지면 읽던 맨 위 글 위치가 서버 홈 읽음 위치(마커)에 저장된다', 저장됨, true);
    });
  });

  await test.case(새게시물버튼, async ({ params }) => {
    await test.step('API 로 새 글을 올린다', async () => {
      await 내글지우기(나!, 'QA TP010');
      await 홈다시열기(driver);
      await 홈.아래로내리기(2);
      await 글쓰기(나!, params.본문);
    });
    await test.step('새 글이 들어온 뒤 「새 게시물」 버튼을 누른다', async () => {
      const 나타남 = await verify('위에 「새 게시물」 버튼이 나타난다', await 홈.새게시물버튼있나(20_000), true);
      if (나타남) await 홈.새게시물누르기();
      const 맨위 = await verify('새 글이 맨 위로 이동한다', await 홈.맨위에올때까지(params.본문), true);
      await verify('새 글이 들어오면 위에 「새 게시물」 버튼이 나타나고 누르면 맨 위로 이동한다', 나타남 && 맨위, true);
    });
  });

  await test.case(필터글숨김, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('필터에 걸리는 글과 안 걸리는 글을 API 로 올린다', async () => {
      const 키워드 = await 필터키워드(나!, params.필터이름);
      await verify('필터 「광고」가 있다', 키워드 !== '', true, { blocker: true });
      await 내글지우기(둘째!, 'QA TP010');
      숨김끔 = true;
      await 목록홈숨김(나!, '친구', false);
      await 글쓰기(둘째!, `QA TP010 ${키워드} 걸림`);
      await 글쓰기(둘째!, params.통과글);
    });
    await test.step('홈을 당겨서 필터에 걸리는 글을 불러온다', async () => {
      const 키워드 = await 필터키워드(나!, params.필터이름);
      await 홈다시열기(driver);
      await verify('필터에 안 걸리는 글이 홈 맨 위에 보인다', await 홈.새로고침해맨위에올때까지(params.통과글), true, { blocker: true });
      await verify('홈을 새로고침하면 필터 「광고」에 걸린 글이 홈에 보이지 않는다', await 홈.글보일때까지(`QA TP010 ${키워드} 걸림`, 3_000), false);
    });
  });
});
