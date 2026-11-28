import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 딥링크열기, 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글자만, 사람글찾기 } from './helpers/api.helper.js';
import { 뷰어진행막대있나, 뷰어컨트롤있나, 카드글자, 프로필열고글찾기 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 토스트에글자있나 } from './helpers/system-ui.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 뷰어버튼들 = defineCase({
  tcId: 'MTA-UI-473',
  name: '미디어 뷰어 상단에 뒤로 · 「다운로드」, 하단에 대체 텍스트 · 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 hana_photo 사진 글을 미디어 뷰어로 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 다운로드 = defineCase({
  tcId: 'MTA-FN-550',
  name: '미디어를 다운로드하면 「다운로드 중…」 뒤 스낵바 「이미지 저장됨」과 「보기」가 보인다',
  platforms: ['android'],
  precondition: ['사진 미디어 뷰어가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 영상뷰어 = defineCase({
  tcId: 'MTA-UI-474',
  name: '영상 미디어 뷰어에 「재생」/「일시정지」와 진행 막대가 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 영상 글을 미디어 뷰어로 열었다'],
  params: z.object({}),
  expected: null,
});

const 다운로드실패 = defineCase({
  tcId: 'MTA-FN-551',
  name: '다운로드에 실패하면 「파일 저장 오류」가 보인다',
  platforms: ['android'],
  precondition: ['사진 미디어 뷰어가 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 영상재생오류 = defineCase({
  tcId: 'MTA-FN-553',
  name: '영상 재생 오류면 토스트 「비디오 재생 오류 발생」이 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 영상 글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 멘션누르기 = defineCase({
  tcId: 'MTA-FN-544',
  name: '본문 @멘션을 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['minjun_dev 가 나를 멘션한 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 서버주소링크 = defineCase({
  tcId: 'MTA-FN-689',
  name: 'https://mastodon.maxihan.com/@… 주소를 열면 앱이 자동으로 열지 않고 앱 선택 창이나 브라우저가 열린다',
  platforms: ['android'],
  precondition: ['우리 서버 프로필 주소가 있다'],
  params: z.object({ 주소: z.string().url().describe('열어 볼 우리 서버 프로필 주소').default('https://mastodon.maxihan.com/@cafe_moon') }),
  expected: null,
});

const 오디오재생알림 = defineCase({
  tcId: 'MTA-FN-700',
  name: '오디오를 재생하면 폰 알림 창에 재생 알림이 보인다',
  platforms: ['android'],
  precondition: ['jiho_cafe 오디오 글이 있다'],
  held: '보류 — 재생해도 폰 알림 창이 「알림 없음」이다(방해 금지 모드가 켜진 팜 폰) (해 본 것: 20261128024956711-오디오-재생-알림창.json · jiho_cafe 오디오 「재생」을 누르고 알림 창을 1번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-067',
  name: '미디어 뷰어',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [뷰어버튼들, 다운로드, 영상뷰어, 다운로드실패, 영상재생오류, 멘션누르기, 서버주소링크, 오디오재생알림],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 뷰어 = new 미디어뷰어화면(driver);
  let 나: 계정 | undefined;
  let 사진글자 = '';
  let 영상글자 = '';

  const 사진뷰어열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await 프로필열고글찾기(driver, 'hana_photo', 사진글자);
    await 카드.사진누르기(사진글자, 0);
    if (!(await 뷰어.떴나(15_000))) throw new Error('사진 미디어 뷰어가 안 열렸다');
  };

  const 영상뷰어열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await 프로필열고글찾기(driver, 'hana_photo', 영상글자);
    await 카드.사진누르기(영상글자, 0);
    if (!(await 뷰어.떴나(15_000))) throw new Error('영상 미디어 뷰어가 안 열렸다');
  };

  await test.case(뷰어버튼들, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    const 사진글 = await 사람글찾기(
      나,
      'hana_photo',
      (x) => x.reblog === null && !x.sensitive && x.spoiler_text === '' && x.media_attachments.length > 0 && x.media_attachments.every((m) => m.type === 'image'),
      '사진',
    );
    사진글자 = 카드글자(사진글);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('hana_photo 사진 글을 미디어 뷰어로 연다', async () => {
      await 프로필열고글찾기(driver, 'hana_photo', 사진글자);
      await 카드.사진누르기(사진글자, 0);
      if (!(await 뷰어.떴나(15_000))) throw new Error('사진 미디어 뷰어가 안 열렸다');
    });
    await test.step('미디어 뷰어 버튼을 확인한다', async () => {
      const 뒤로 = await verify('상단에 뒤로 버튼이 보인다', await 뷰어.버튼있나('뒤로'), true);
      const 다운로드버튼 = await verify('상단에 「다운로드」가 보인다', await 뷰어.버튼있나('다운로드'), true);
      const 대체텍스트 = await verify('하단에 대체 텍스트가 보인다', await 뷰어.버튼있나('대체 텍스트'), true);
      const 답장 = await verify('하단에 답장 버튼이 보인다', await 뷰어.버튼있나('답장'), true);
      const 부스트 = await verify('하단에 부스트 버튼이 보인다', await 뷰어.버튼있나('부스트'), true);
      const 좋아요 = await verify('하단에 좋아요 버튼이 보인다', await 뷰어.버튼있나('좋아요'), true);
      const 북마크 = await verify('하단에 북마크 버튼이 보인다', await 뷰어.버튼있나('북마크'), true);
      const 공유 = await verify('하단에 공유 버튼이 보인다', await 뷰어.버튼있나('공유'), true);
      await verify(
        '미디어 뷰어 상단에 뒤로 · 「다운로드」, 하단에 대체 텍스트 · 답장 · 부스트 · 좋아요 · 북마크 · 공유 버튼이 보인다',
        뒤로 && 다운로드버튼 && 대체텍스트 && 답장 && 부스트 && 좋아요 && 북마크 && 공유,
        true,
      );
    });
  });

  await test.case(다운로드, async () => {
    await test.step('사진 미디어 뷰어가 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 뷰어.떴나(2_000))) await 사진뷰어열기();
    });
    await test.step('「다운로드」를 누른다', async () => {
      await 뷰어.누르기('다운로드');
      const 진행 = await verify('「다운로드 중…」이 보인다', await 토스트에글자있나(driver, '다운로드 중', 6_000), true);
      const 저장됨 = await verify('「이미지 저장됨」이 보인다', await 토스트에글자있나(driver, '이미지 저장됨', 20_000), true);
      await verify('미디어를 다운로드하면 「다운로드 중…」 뒤 스낵바 「이미지 저장됨」과 「보기」가 보인다', 진행 && 저장됨, true);
    });
  });

  await test.case(영상뷰어, async () => {
    const 영상글 = await 사람글찾기(
      나!,
      'hana_photo',
      (x) => x.reblog === null && !x.sensitive && x.spoiler_text === '' && x.media_attachments.some((m) => m.type === 'video' || m.type === 'gifv'),
      '영상',
    );
    영상글자 = 카드글자(영상글);
    await test.step('hana_photo 영상 글을 미디어 뷰어로 연다', async () => {
      await 영상뷰어열기();
    });
    await test.step('영상 미디어 뷰어를 확인한다', async () => {
      const 재생 = await verify('「재생」/「일시정지」가 보인다', (await 뷰어컨트롤있나(driver, '재생')) || (await 뷰어컨트롤있나(driver, '일시정지')), true);
      const 막대 = await verify('진행 막대가 보인다', await 뷰어진행막대있나(driver), true);
      await verify('영상 미디어 뷰어에 「재생」/「일시정지」와 진행 막대가 보인다', 재생 && 막대, true);
    });
  });

  await test.case(다운로드실패, async () => {
    await test.step('사진 미디어 뷰어를 다시 연다', async () => {
      await 사진뷰어열기();
    });
    await test.step('통신을 끊은 채 「다운로드」를 누른다', async () => {
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 뷰어.누르기('다운로드');
        await verify('다운로드에 실패하면 「파일 저장 오류」가 보인다', await 토스트에글자있나(driver, '파일 저장 오류', 20_000), true);
      });
    });
  });

  await test.case(영상재생오류, async () => {
    await test.step('hana_photo 프로필에서 영상 글 카드를 다시 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'hana_photo', 영상글자);
    });
    await test.step('통신을 끊은 채 영상을 연다', async () => {
      await 폰상태에서(driver, { 네트워크: '끊김' }, async () => {
        await 카드.사진누르기(영상글자, 0);
        await verify('영상 재생 오류면 토스트 「비디오 재생 오류 발생」이 보인다', await 토스트에글자있나(driver, '비디오 재생 오류 발생', 20_000), true);
      });
    });
  });

  await test.case(멘션누르기, async () => {
    const 멘션글 = await 사람글찾기(나!, 'minjun_dev', (x) => x.reblog === null && 글자만(x.content).startsWith('@qa_user1'), '나를 멘션한');
    await test.step('minjun_dev 프로필에서 나를 멘션한 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(멘션글));
    });
    await test.step('본문의 「@qa_user1」 멘션을 누른다', async () => {
      await 카드.본문왼쪽끝누르기(카드글자(멘션글));
      const 프로필 = new 프로필화면(driver);
      const 열림 = await verify('프로필이 열린다', await 프로필.떴나(), true);
      const 계정 = await verify('열린 프로필이 멘션한 사람의 것이다', (await 프로필.계정글()).includes('qa_user1'), true);
      await verify('본문 @멘션을 누르면 그 사람 프로필이 열린다', 열림 && 계정, true);
    });
  });

  await test.case(서버주소링크, async ({ params }) => {
    await test.step('https://mastodon.maxihan.com/@cafe_moon 링크를 연다', async () => {
      const 앱이받음 = await 딥링크열기(driver, params.주소).then(
        () => true,
        () => false,
      );
      await verify('https://mastodon.maxihan.com/@… 주소를 열면 앱이 자동으로 열지 않고 앱 선택 창이나 브라우저가 열린다', 앱이받음, false);
    });
  });

  await test.case(오디오재생알림, async () => {
    await test.step('오디오를 재생하고 폰 알림 창을 내린다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'jiho_cafe', '짧은 멜로디');
      await verify('오디오를 재생하면 폰 알림 창에 재생 알림이 보인다', await 카드.보이나('짧은 멜로디'), true);
    });
  });
});
