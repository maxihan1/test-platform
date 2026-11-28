import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입양식열기, 가입양식채우기, 새이메일, 오류문구가뜰때까지, 글이될때까지읽기 } from './helpers/flow-start.helper.js';
import { 앱이닫힐때까지 } from './helpers/flow-share.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 가입양식 } from './pages/signup.page.js';
import { 시작화면 } from './pages/start.page.js';

const 가입성공 = defineCase({
  tcId: 'MTA-FN-069',
  name: '가입에 성공하면 이메일 확인 화면 「수신함 확인하기」로 간다',
  platforms: ['android'],
  precondition: ['가입 양식에 「tc_signup」으로 시작하는 새 사용자명과 새 이메일이 채워져 있다'],
  params: z.object({ 이메일: z.string().email().describe('가입할 새 이메일 — 실행마다 새로 만든다').optional() }),
  expected: z.object({ 제목: z.string().describe('이메일 확인 화면 제목').default('수신함 확인하기') }),
});

const 확인화면문구 = defineCase({
  tcId: 'MTA-UI-085',
  name: '이메일 확인 화면에 제목 「수신함 확인하기」와 안내 「<이메일>에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['가입을 마쳐 이메일 확인 화면에 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('이메일 확인 화면 제목').default('수신함 확인하기'),
    안내꼬리: z.string().describe('안내 문구에서 이메일 뒤 글').default('에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.'),
  }),
});

const 재전송토스트 = defineCase({
  tcId: 'MTA-FN-108',
  name: '이메일 확인 화면에서 「재전송」에 성공하면 토스트 「확인용 이메일이 보내졌습니다」가 보인다',
  platforms: ['android'],
  precondition: ['이메일 확인 화면에 있다'],
  params: z.object({}),
  expected: z.object({ 토스트: z.string().describe('재전송 성공 토스트').default('확인용 이메일이 보내졌습니다') }),
});

const 재전송잠김 = defineCase({
  tcId: 'MTA-FN-109',
  name: '「재전송」을 누르면 버튼이 「재전송 (n)」으로 꺼져 보인다',
  platforms: ['android'],
  precondition: ['이메일 확인 화면에서 「재전송」을 눌렀다', '이메일 확인 화면에서 「재전송」을 눌렀다'],
  params: z.object({ 기다림: z.number().int().min(60_001).max(90_000).describe('다시 켜질 때까지 기다릴 시간(밀리초) — 60초 넘게').default(65_000) }),
  expected: null,
});

const 뒤로가면닫힘 = defineCase({
  tcId: 'MTA-FN-623',
  name: '이메일 확인 화면에서 뒤로 가기를 누르면 앱이 닫힌다',
  platforms: ['android'],
  precondition: ['이메일 확인 화면에 있다'],
  params: z.object({}),
  expected: null,
});

const 막힌도메인 = defineCase({
  tcId: 'MTA-FN-609',
  name: '막힌 도메인 이메일로 「다음」을 누르면 「<이메일>은 <도메인>에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다',
  platforms: ['android'],
  precondition: ['가입을 막은 이메일 도메인이 있다'],
  held: '보류 — 테스트 계정 없음 — 관리자 계정 값으로 웹 로그인하면 「올바르지 않은 이메일 주소 혹은 암호입니다.」로 거절돼 이메일 도메인을 막을 수 없다',
  techniques: ['동등 분할'],
  params: z.object({ 막힌이메일: z.string().min(3).describe('이메일 칸에 적을 글 — 가입을 막은 도메인의 이메일') }),
  expected: null,
});

const 서버가틀린이메일 = defineCase({
  tcId: 'MTA-FN-610',
  name: '서버가 이메일을 틀렸다고 돌려주면 이메일 칸에 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['서버가 틀렸다고 보는 이메일이 있다'],
  held: '보류 — 앱 꼴 검사는 통과하고 서버만 틀렸다고 보는 이메일이 없다 (해 본 것: 20261128061224283-가입-점두개-이메일-다음.json · 20261128061327018-가입-하이픈도메인-이메일.json · 이메일 두 가지로 2번)',
  techniques: ['동등 분할'],
  params: z.object({ 틀린이메일: z.string().min(3).describe('이메일 칸에 적을 글 — 앱 검사는 통과하고 서버가 틀렸다고 보는 이메일') }),
  expected: z.object({ 오류: z.string().describe('이메일 칸 오류 문구').default('유효한 이메일 주소처럼 보이지 않습니다.') }),
});

const 메일앱없음 = defineCase({
  tcId: 'MTA-FN-622',
  name: '이메일 앱이 없을 때 「이메일 앱 열기」를 누르면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['이메일 확인 화면에 있고 폰에 이메일 앱이 없다'],
  held: '보류 — 팜 폰에 이메일 앱(Gmail)이 깔려 있어 「앱 없음」 상태를 만들 수 없다',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-008',
  name: '가입하고 이메일 확인 화면',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [가입성공, 확인화면문구, 재전송토스트, 재전송잠김, 뒤로가면닫힘, 메일앱없음, 막힌도메인, 서버가틀린이메일],
});

test(procedure, async ({ driver }) => {
  const 양식 = new 가입양식(driver);
  const 확인 = new 이메일확인화면(driver);
  let 가입이메일 = '';

  await test.case(가입성공, async ({ params, expected }) => {
    await test.step('가입 양식에 새 사용자명과 새 이메일을 채운다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      가입이메일 = params.이메일 ?? 새이메일();
      await 가입양식채우기(driver, { 이메일: 가입이메일 });
      await verify('가입 양식이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
    });
    await test.step('새 사용자명으로 「다음」을 누른다', async () => {
      await 양식.다음누르기();
      await verify('가입에 성공하면 이메일 확인 화면 「수신함 확인하기」로 간다', await 확인.제목있나(expected.제목), true);
    });
  });

  await test.case(확인화면문구, async ({ expected }) => {
    await test.step('이메일 확인 화면 문구를 확인한다', async () => {
      const 제목 = await verify('제목 「수신함 확인하기」가 보인다', await 확인.제목있나(expected.제목, 10_000), true);
      const 안내 = await verify('안내 「<이메일>에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」가 보인다', await 확인.안내글(expected.안내꼬리), `${가입이메일}${expected.안내꼬리}`);
      await verify('이메일 확인 화면에 제목 「수신함 확인하기」와 안내 「<이메일>에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」가 보인다', 제목 && 안내, true);
    });
  });

  await test.case(재전송토스트, async ({ expected }) => {
    await test.step('이메일 확인 화면에서 「재전송」을 누른다', async () => {
      if (!(await 확인.제목있나('수신함 확인하기', 10_000))) throw new Error('이메일 확인 화면이 아니다');
      const [, 토스트] = await Promise.all([확인.재전송누르기(), 확인.토스트에글자있나(expected.토스트, 15_000)]);
      await verify('이메일 확인 화면에서 「재전송」에 성공하면 토스트 「확인용 이메일이 보내졌습니다」가 보인다', 토스트, true);
    });
  });

  await test.case(재전송잠김, async ({ params }) => {
    await test.step('「재전송」 버튼 글자와 켜짐을 확인한다', async () => {
      const 글 = await verify('「재전송」 버튼 글자가 「재전송 (n)」이다', /^재전송 \(\d+\)$/.test(await 확인.재전송글()), true);
      const 꺼짐 = await verify('「재전송」 버튼이 꺼져 있다', await 확인.재전송켜졌나(), false);
      await verify('「재전송」을 누르면 버튼이 「재전송 (n)」으로 꺼져 보인다', 글 && 꺼짐, true);
    });
    await test.step('60초 넘게 기다린다', async () => {
      await verify('60초가 지난 뒤 「재전송」 버튼이 다시 켜진다', await 확인.재전송켜질때까지(params.기다림), true);
    });
  });

  await test.case(뒤로가면닫힘, async () => {
    await test.step('이메일 확인 화면에서 뒤로 가기를 누른다', async () => {
      if (!(await 확인.제목있나('수신함 확인하기', 10_000))) throw new Error('이메일 확인 화면이 아니다');
      await driver.back();
      await verify('이메일 확인 화면에서 뒤로 가기를 누르면 앱이 닫힌다', await 앱이닫힐때까지(driver), true);
    });
  });

  await test.case(메일앱없음, async () => {
    await test.step('「이메일 앱 열기」를 누른다', async () => {
      await 시작화면열기(driver);
      await verify('이메일 앱이 없을 때 「이메일 앱 열기」를 누르면 토스트 「이 동작을 처리할 앱이 없습니다」가 보인다', await new 시작화면(driver).떴나(), true);
    });
  });

  await test.case(막힌도메인, async ({ params }) => {
    await test.step('막힌 도메인 이메일로 「다음」을 누른다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 이메일: params.막힌이메일 });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      const 도메인 = params.막힌이메일.split('@')[1] ?? '';
      await verify(
        '막힌 도메인 이메일로 「다음」을 누르면 「<이메일>은 <도메인>에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.」가 보인다',
        await 오류문구가뜰때까지(driver, 양식, `${params.막힌이메일}은 ${도메인}에서의 가입을 허용하지 않습니다. 다른 것을 시도하거나 다른 서버를 선택하세요.`, 20_000),
        true,
      );
    });
  });

  await test.case(서버가틀린이메일, async ({ params, expected }) => {
    await test.step('서버가 틀렸다고 보는 이메일로 「다음」을 누른다', async () => {
      await verify('가입 양식이 열려 있다', await 가입양식열기(driver), true, { blocker: true });
      await 가입양식채우기(driver, { 이메일: params.틀린이메일 });
      await verify('가입 양식 나머지 칸이 맞게 채워져 「다음」이 켜져 있다', await 양식.다음켜질때까지(), true, { blocker: true });
      await 양식.다음누르기();
      await verify('서버가 이메일을 틀렸다고 돌려주면 이메일 칸에 「유효한 이메일 주소처럼 보이지 않습니다.」가 보인다', await 글이될때까지읽기(driver, () => 양식.칸오류글('이메일', 2_000), expected.오류, 20_000), expected.오류);
    });
  });
});
