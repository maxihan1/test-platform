import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 설정열기, 화면에글자있나 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

const 업데이트배너 = defineCase({
  tcId: 'MTA-UI-525',
  name: '새 버전이 있으면 설정에 업데이트 배너 「새로운 업데이트가 있습니다.」 · 「버전 <n>」 · 「다운로드 (<크기>)」가 보인다',
  platforms: ['android'],
  precondition: ['githubRelease 빌드에 새 버전이 있다'],
  held: '보류 — 시험 빌드가 githubRelease 가 아닌 디버그 빌드라 업데이트를 확인하지 않는다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 배너: z.string().describe('업데이트 배너 첫 줄').default('새로운 업데이트가 있습니다.') }),
});

const 다운로드누르기 = defineCase({
  tcId: 'MTA-FN-665',
  name: '업데이트 배너 「다운로드」를 누르면 「다운로드 중…(n%)」 + 「취소」 뒤 「설치」가 보인다',
  platforms: ['android'],
  precondition: ['업데이트 배너가 떠 있다'],
  held: '보류 — 시험 빌드가 githubRelease 가 아닌 디버그 빌드라 업데이트를 확인하지 않는다',
  params: z.object({}),
  expected: z.object({ 설치: z.string().describe('다운로드가 끝난 뒤 배너 버튼 글').default('설치') }),
});

const 릴리스조회 = defineCase({
  tcId: 'MTA-FN-666',
  name: '앱을 켜 두면 24시간마다 GitHub 최신 릴리스를 조회한다',
  platforms: ['android'],
  precondition: ['githubRelease 빌드다'],
  held: '보류 — 시험 빌드가 githubRelease 가 아닌 디버그 빌드라 업데이트를 확인하지 않는다',
  params: z.object({}),
  expected: z.object({ 배너: z.string().describe('최신 릴리스를 조회한 뒤 설정에 뜨는 배너 첫 줄').default('새로운 업데이트가 있습니다.') }),
});

const 설치권한막힘 = defineCase({
  tcId: 'MTA-FN-667',
  name: '앱 자체 업데이트 설치 권한을 막으면 설치할 수 없다',
  platforms: ['android'],
  precondition: ['githubRelease 빌드의 설치 권한을 막았다'],
  techniques: ['동등 분할'],
  held: '보류 — 시험 빌드가 githubRelease 가 아닌 디버그 빌드라 업데이트를 확인하지 않는다',
  params: z.object({}),
  expected: z.object({ 배너: z.string().describe('설치하지 못했을 때 그대로 남는 배너 첫 줄').default('새로운 업데이트가 있습니다.') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-054',
  name: '업데이트 배너(githubRelease 빌드)',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [업데이트배너, 다운로드누르기, 릴리스조회, 설치권한막힘],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);

  await test.case(업데이트배너, async ({ expected }) => {
    await test.step('일반 회원으로 홈에 들어가 설정 화면을 연다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 설정열기(driver);
    });
    await test.step('설정 업데이트 배너를 확인한다', async () => {
      await verify(
        '새 버전이 있으면 설정에 업데이트 배너 「새로운 업데이트가 있습니다.」 · 「버전 <n>」 · 「다운로드 (<크기>)」가 보인다',
        await 화면에글자있나(driver, expected.배너, 10_000),
        true,
      );
    });
  });

  await test.case(다운로드누르기, async ({ expected }) => {
    await test.step('배너 「다운로드」를 누른다', async () => {
      await 설정.줄누르기('다운로드');
      await verify('업데이트 배너 「다운로드」를 누르면 「다운로드 중…(n%)」 + 「취소」 뒤 「설치」가 보인다', await 화면에글자있나(driver, expected.설치, 60_000), true);
    });
  });

  await test.case(릴리스조회, async ({ expected }) => {
    await test.step('앱이 24시간마다 GitHub 릴리스를 조회하는지 본다', async () => {
      await verify('앱을 켜 두면 24시간마다 GitHub 최신 릴리스를 조회한다', await 화면에글자있나(driver, expected.배너, 10_000), true);
    });
  });

  await test.case(설치권한막힘, async ({ expected }) => {
    await test.step('업데이트 「설치」를 누른다', async () => {
      await 설정.줄누르기('설치');
      await verify('앱 자체 업데이트 설치 권한을 막으면 설치할 수 없다', await 화면에글자있나(driver, expected.배너, 5_000), true);
    });
  });
});
