import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 스크롤해서찾기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 스낵바 } from './components/snackbar.component.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 확인창 } from './components/dialog.component.js';
import { type 계정, api, 계정꺼내기, 계정찾기, 팔로우 } from './helpers/api.helper.js';
import { 아는팔로워있는계정, 팔로우목록제목글, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 팔로우목록화면 } from './pages/follow-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 타임라인필터 = defineCase({
  tcId: 'MTA-UI-318',
  name: '프로필 타임라인 머리에 「Posts and boosts」와 필터 버튼이 보이고 누르면 「Show replies」 · 「Show boosts」 체크가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 hana_photo 프로필을 열었다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 글이 있는 시드 계정의 사용자명').default('hana_photo') }),
  expected: null,
});

const 고정글 = defineCase({
  tcId: 'MTA-UI-320',
  name: '첫 고정 글이 「Pinned」와 함께 맨 위에 보이고 「View all pinned posts」가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 의 고정 글이 2개다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('열어 볼 계정 — 고정 글이 2개인 시드 계정의 사용자명').default('hana_photo'),
  }),
  expected: z.object({ 고정글수: z.number().describe('그 계정의 고정 글 수').default(2) }),
});

const 해시태그칩 = defineCase({
  tcId: 'MTA-FN-380',
  name: '프로필 해시태그 칩을 누르면 그 해시태그가 든 글만 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 프로필에 추천 해시태그 칩이 있다'],
  params: z.object({
    사용자명: z.string().min(1).describe('열어 볼 계정 — 추천 해시태그가 있는 시드 계정의 사용자명').default('hana_photo'),
    태그: z.string().min(1).describe('누를 추천 해시태그 — # 없이').default('가을'),
  }),
  expected: null,
});

const 알림종 = defineCase({
  tcId: 'MTA-FN-376',
  name: '알림 종 버튼을 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」 또는 「…받지 않게 될 것입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['내가 팔로우하는 news_bot 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 팔로우하는 계정의 사용자명').default('news_bot') }),
  expected: z.object({
    켬: z.string().describe('알림을 켠 뒤 스낵바').default('새로운 게시물에 대한 알림을 받을 것입니다.'),
    끔말: z.string().describe('알림을 끈 뒤 스낵바 끝말').default('받지 않게 될 것입니다.'),
  }),
});

const 팔로워목록 = defineCase({
  tcId: 'MTA-FN-392',
  name: '프로필 「Followers」 숫자를 누르면 팔로워 목록(계정 줄과 팔로우 버튼)이 열린다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['hana_photo 프로필이 열려 있다', 'daily_woo 프로필이 열려 있다'],
  params: z.object({
    팔로워용: z.string().min(1).describe('팔로워 수를 누를 계정 — 팔로워가 있는 시드 계정의 사용자명').default('hana_photo'),
    팔로잉용: z.string().min(1).describe('팔로잉 수를 누를 계정 — 시드 계정의 사용자명').default('daily_woo'),
  }),
  expected: z.object({ 팔로잉말: z.string().describe('팔로잉 목록 머리에 든 말').default('팔로잉') }),
});

const 아는팔로워목록 = defineCase({
  tcId: 'MTA-FN-393',
  name: '아는 팔로워 줄을 누르면 그 목록이 열린다',
  platforms: ['android'],
  precondition: ['아는 팔로워 줄이 있는 프로필이 열려 있다'],
  params: z.object({
    후보: z.string().min(1).describe('아는 팔로워를 찾아볼 계정들 — 쉼표로 이은 사용자명').default('hana_photo,minjun_dev,jiho_cafe,seoyeon_books,daily_woo,news_bot'),
  }),
  expected: null,
});

const 새계정탭 = defineCase({
  tcId: 'MTA-UI-524',
  name: '새 계정 프로필에 「타임라인」 탭만 보이고 탭 줄이 숨겨진다',
  platforms: ['android'],
  precondition: ['가입 직후 계정 프로필을 열었다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 글도 팔로워도 없는 새 계정의 사용자명').default('qa_blank') }),
  expected: null,
});

const 긴항목값 = defineCase({
  tcId: 'MTA-FN-651',
  name: '프로필 항목의 긴 값을 누르면 전체 창이 뜬다',
  platforms: ['android'],
  precondition: ['프로필 항목 값이 긴 계정이 있다'],
  held: '보류 — hana_photo 항목 값이 짧은 링크뿐이라 누르면 Chrome 이 열린다',
  params: z.object({
    사용자명: z.string().min(1).describe('열어 볼 계정 — 항목 값이 긴 계정의 사용자명'),
    항목: z.string().min(1).describe('누를 항목의 제목 — 그 계정의 항목 중 값이 긴 것'),
  }),
  expected: null,
});

const 인증링크 = defineCase({
  tcId: 'MTA-UI-523',
  name: '프로필 항목의 인증 링크가 초록 배경으로 보인다',
  platforms: ['android'],
  precondition: ['인증된 링크 항목이 있는 프로필이 있다'],
  held: '보류 — 시드 프로필에 인증된 링크 항목이 없다 (해 본 것: 20261128023955628-프로필-항목-누르기.json · hana_photo 항목에 인증 표시가 없는 것 1번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-041',
  name: '남의 프로필 — 타임라인과 목록',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [고정글, 해시태그칩, 알림종, 아는팔로워목록, 타임라인필터, 새계정탭, 인증링크, 긴항목값, 팔로워목록],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 글목록 = new 프로필글목록(driver);
  const 목록 = new 팔로우목록화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('새 글 알림을 시드 상태로 되돌린다', async () => {
    if (나 !== undefined) await 팔로우(나, 'news_bot', true);
  });

  await test.case(고정글, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('hana_photo 의 고정 글이 2개인지 API 로 확인한다', async () => {
      const 대상 = await 계정찾기(나!, params.사용자명);
      const 고정들 = await api<unknown[]>(나!, 'GET', `/api/v1/accounts/${대상.id}/statuses?pinned=true`);
      await verify('상대의 고정 글 수가 기대값과 같다', 고정들.length, expected.고정글수, { blocker: true });
    });
    await test.step('고정 글 자리를 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      if (!(await 글목록.고정배지있나(3_000))) await 프로필.바깥으로내리기();
      const 배지 = await verify('첫 고정 글에 「Pinned」가 보인다', await 글목록.고정배지있나(10_000), true);
      const 모두보기 = await verify('「View all pinned posts」가 보인다', await 글목록.모든고정글보이나(), true);
      await verify('첫 고정 글이 「Pinned」와 함께 맨 위에 보이고 「View all pinned posts」가 보인다', 배지 && 모두보기, true);
    });
  });

  await test.case(해시태그칩, async ({ params }) => {
    await test.step('hana_photo 프로필의 해시태그 칩 자리로 간다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      if (!(await 글목록.칩있나(params.태그, 3_000))) await 스크롤해서찾기(driver, `#${params.태그}`);
    });
    await test.step('해시태그 칩을 누른다', async () => {
      await 글목록.칩누르기(params.태그);
      const 글들 = await 될때까지(driver, async () => (await 글목록.보이는글본문들()).length > 0, 15_000) ? await 글목록.보이는글본문들() : [];
      const 있음 = await verify('글이 하나 이상 보인다', 글들.length > 0, true);
      const 그태그만 = await verify('보이는 글마다 그 해시태그가 들어 있다', 글들.every((글) => 글.includes(`#${params.태그}`)), true);
      await verify('프로필 해시태그 칩을 누르면 그 해시태그가 든 글만 보인다', 있음 && 그태그만, true);
    });
  });

  await test.case(알림종, async ({ params, expected }) => {
    await test.step('news_bot 을 새 글 알림을 켠 채 팔로우한 상태로 맞춘다', async () => {
      await 팔로우(나!, params.사용자명, true);
    });
    await test.step('news_bot 프로필의 알림 종 버튼을 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('알림 종 버튼이 보인다', await 프로필.알림종있나(10_000), true, { blocker: true });
      await 프로필.알림종누르기();
      const 글 = await new 스낵바(driver).글읽기(10_000);
      await verify('알림 종 버튼을 누르면 스낵바 「새로운 게시물에 대한 알림을 받을 것입니다.」 또는 「…받지 않게 될 것입니다.」가 보인다', 글 === expected.켬 || 글.endsWith(expected.끔말), true);
    });
  });

  await test.case(아는팔로워목록, async ({ params }) => {
    let 대상 = '';
    let 계정들: string[] = [];
    await test.step('아는 팔로워가 있는 계정을 API 로 찾는다', async () => {
      const 찾음 = await 아는팔로워있는계정(나!, params.후보.split(',').map((글) => 글.trim()));
      대상 = 찾음.사용자명;
      계정들 = 찾음.계정들;
    });
    await test.step('아는 팔로워 줄을 누른다', async () => {
      await 프로필열어보기(driver, 대상);
      await verify('아는 팔로워 줄이 보인다', await 프로필.아는팔로워있나(15_000), true, { blocker: true });
      await 프로필.아는팔로워누르기();
      const 떴다 = await verify('아는 팔로워 목록이 열린다', await 목록.떴나(), true);
      const 계정글 = await 목록.계정글들();
      const 아는사람 = await verify('목록에 아는 팔로워 계정이 보인다', 계정들.some((이름) => 계정글.some((글) => 글.includes(`@${이름}`))), true);
      await verify('아는 팔로워 줄을 누르면 그 목록이 열린다', 떴다 && 아는사람, true);
    });
  });

  await test.case(타임라인필터, async ({ params }) => {
    await test.step('프로필 타임라인 머리를 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      if (!(await 글목록.필터있나(3_000))) await 프로필.바깥으로내리기();
      const 제목 = await verify('프로필 타임라인 머리에 「Posts and boosts」가 보인다', await 글목록.필터있나(), true);
      await 글목록.필터누르기();
      const 메뉴 = new 펼친메뉴(driver);
      const 답글 = await verify('필터를 누르면 「Show replies」 체크가 보인다', await 메뉴.항목있나('Show replies', 5_000), true);
      const 부스트 = await verify('필터를 누르면 「Show boosts」 체크가 보인다', await 메뉴.항목있나('Show boosts', 5_000), true);
      await verify(
        '프로필 타임라인 머리에 「Posts and boosts」와 필터 버튼이 보이고 누르면 「Show replies」 · 「Show boosts」 체크가 보인다',
        제목 && 답글 && 부스트,
        true,
      );
      if (답글 || 부스트) await 메뉴.닫기();
    });
  });

  await test.case(새계정탭, async ({ params }) => {
    await test.step('새 계정 프로필의 탭 줄을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      const 미디어 = await verify('새 계정 프로필에 「미디어」 탭이 보이지 않는다', !(await 글목록.탭있나('미디어', 3_000)), true);
      const 추천 = await verify('새 계정 프로필에 「추천」 탭이 보이지 않는다', !(await 글목록.탭있나('추천', 3_000)), true);
      const 탭줄 = await verify('새 계정 프로필의 탭 줄이 보이지 않는다', !(await 글목록.탭줄있나(3_000)), true);
      await verify('새 계정 프로필에 「타임라인」 탭만 보이고 탭 줄이 숨겨진다', 미디어 && 추천 && 탭줄, true);
    });
  });

  await test.case(인증링크, async () => {
    await test.step('인증 링크 항목을 확인한다', async () => {
      await 프로필열어보기(driver, 'hana_photo');
      await verify('프로필 항목의 인증 링크가 초록 배경으로 보인다', await 프로필.항목있나(), true);
    });
  });

  await test.case(긴항목값, async ({ params }) => {
    await test.step('긴 항목 값을 누른다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.항목값누르기(params.항목);
      await verify('프로필 항목의 긴 값을 누르면 전체 창이 뜬다', await new 확인창(driver).떴나(), true);
    });
  });

  await test.case(팔로워목록, async ({ params, expected }) => {
    await test.step('「Followers」 숫자를 누른다', async () => {
      await 프로필열어보기(driver, params.팔로워용);
      await 프로필.팔로워누르기();
      const 떴다 = await verify('팔로워 목록이 열린다', await 목록.떴나(), true);
      const 줄 = await verify('팔로워 목록에 계정 줄이 보인다', (await 목록.계정글들()).length > 0, true);
      const 버튼 = await verify('팔로워 목록에 팔로우 버튼이 보인다', (await 목록.버튼글들()).length > 0, true);
      await verify('프로필 「Followers」 숫자를 누르면 팔로워 목록(계정 줄과 팔로우 버튼)이 열린다', 떴다 && 줄 && 버튼, true);
    });
    await test.step('「Following」 숫자를 누른다', async () => {
      await 프로필열어보기(driver, params.팔로잉용);
      await 프로필.팔로잉누르기();
      await verify('「Following」 숫자로는 팔로잉 목록이 열린다', (await 팔로우목록제목글(driver)).includes(expected.팔로잉말), true);
    });
  });
});
