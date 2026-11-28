import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 계정찾기 } from './helpers/api.helper.js';
import { 가입연도, 아는팔로워있는계정, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필글목록 } from './pages/profile-feed.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 봇배지 = defineCase({
  tcId: 'MTA-UI-307',
  name: '봇 계정 프로필에 「Automated account」 배지가 보인다',
  platforms: ['android'],
  precondition: ['news_bot 은 봇 계정이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('열어 볼 계정 — 봇으로 표시된 계정의 사용자명').default('news_bot'),
  }),
  expected: null,
});

const 잠긴계정배지 = defineCase({
  tcId: 'MTA-UI-309',
  name: '잠긴 계정 프로필에 「수동으로 팔로워 승인」이 보인다',
  platforms: ['android'],
  precondition: ['yuna_locked 는 잠긴 계정이다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 잠긴 계정의 사용자명').default('yuna_locked') }),
  expected: null,
});

const 가입날짜 = defineCase({
  tcId: 'MTA-UI-313',
  name: '올해 가입한 계정의 「가입」 날짜가 월일로 보인다',
  platforms: ['android'],
  precondition: ['올해 가입한 hana_photo 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 올해 가입한 계정의 사용자명').default('hana_photo') }),
  expected: null,
});

const 아는팔로워줄 = defineCase({
  tcId: 'MTA-UI-314',
  name: '아는 팔로워 줄이 「<이름> 님이 팔로우함」 꼴로 보인다',
  platforms: ['android'],
  precondition: ['내가 팔로우하는 사람이 팔로우하는 계정 프로필이 열려 있다'],
  params: z.object({
    후보: z.string().min(1).describe('아는 팔로워를 찾아볼 계정들 — 쉼표로 이은 사용자명').default('hana_photo,minjun_dev,jiho_cafe,seoyeon_books,daily_woo,news_bot'),
  }),
  expected: z.object({ 꼬리: z.string().describe('아는 팔로워 줄 끝말').default('님이 팔로우함') }),
});

const 프로필탭줄 = defineCase({
  tcId: 'MTA-UI-316',
  name: '미디어 탭을 켠 hana_photo 프로필에 「타임라인」 · 「미디어」 탭이 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 미디어 탭을 켠 계정의 사용자명').default('hana_photo') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-075',
  name: '남의 프로필 — 계정 배지와 가입 · 탭',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [봇배지, 잠긴계정배지, 가입날짜, 아는팔로워줄, 프로필탭줄],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 글목록 = new 프로필글목록(driver);
  let 나: 계정 | undefined;

  await test.case(봇배지, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('news_bot 이 봇 계정인지 API 로 확인한다', async () => {
      await verify('상대가 봇 계정이다', (await 계정찾기(나!, params.사용자명)).bot ?? false, true, { blocker: true });
    });
    await test.step('news_bot 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('봇 계정 프로필에 「Automated account」 배지가 보인다', await 프로필.배지있나('Automated account'), true);
    });
  });

  await test.case(잠긴계정배지, async ({ params }) => {
    await test.step('yuna_locked 가 잠긴 계정인지 API 로 확인한다', async () => {
      await verify('상대가 잠긴 계정이다', (await 계정찾기(나!, params.사용자명)).locked ?? false, true, { blocker: true });
    });
    await test.step('yuna_locked 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('잠긴 계정 프로필에 「수동으로 팔로워 승인」이 보인다', await 프로필.배지있나('수동으로 팔로워 승인'), true);
    });
  });

  await test.case(가입날짜, async ({ params }) => {
    await test.step('그 계정이 올해 가입했는지 API 로 확인한다', async () => {
      await verify('상대가 올해 가입했다', (await 가입연도(나!, params.사용자명)) === new Date().getFullYear(), true, { blocker: true });
    });
    await test.step('가입 날짜를 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('올해 가입한 계정의 「가입」 날짜가 월일로 보인다', /\d{1,2}월 \d{1,2}일/.test(await 프로필.수글('가입')), true);
    });
  });

  await test.case(아는팔로워줄, async ({ params, expected }) => {
    let 대상 = '';
    let 이름들: string[] = [];
    await test.step('아는 팔로워가 있는 계정을 API 로 찾는다', async () => {
      const 찾음 = await 아는팔로워있는계정(나!, params.후보.split(',').map((글) => 글.trim()));
      대상 = 찾음.사용자명;
      이름들 = 찾음.이름들;
    });
    await test.step('아는 팔로워 줄을 확인한다', async () => {
      await 프로필열어보기(driver, 대상);
      const 줄 = await verify('아는 팔로워 줄이 보인다', await 프로필.아는팔로워있나(15_000), true);
      const 글 = await 프로필.아는팔로워글();
      const 꼬리 = await verify('아는 팔로워 줄이 「님이 팔로우함」으로 끝난다', 글.endsWith(expected.꼬리), true);
      const 이름 = await verify('아는 팔로워 줄에 아는 팔로워의 이름이 든다', 이름들.some((이름) => 글.includes(이름)), true);
      await verify('아는 팔로워 줄이 「<이름> 님이 팔로우함」 꼴로 보인다', 줄 && 꼬리 && 이름, true);
    });
  });

  await test.case(프로필탭줄, async ({ params }) => {
    await test.step('프로필 탭 줄을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      if (!(await 글목록.탭줄있나(3_000))) await 프로필.바깥으로내리기();
      const 타임라인 = await verify('프로필에 「타임라인」 탭이 보인다', await 글목록.탭있나('타임라인', 10_000), true);
      const 미디어 = await verify('프로필에 「미디어」 탭이 보인다', await 글목록.탭있나('미디어', 10_000), true);
      await verify('미디어 탭을 켠 hana_photo 프로필에 「타임라인」 · 「미디어」 탭이 보인다', 타임라인 && 미디어, true);
    });
  });
});
