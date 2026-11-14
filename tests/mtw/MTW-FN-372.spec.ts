import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-372',
  name: '글 인용을 시작하면 「이미지, 영상, 오디오 파일 추가」를 누를 수 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 카드 = new 글카드목록(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('4.7 의 인용');
    await verify('hana_photo 공개 글 카드가 보인다', await 카드.카드('4.7 의 인용').isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 공개 글의 「인용」을 눌러 인용을 시작한다', async () => {
    await 카드.부스트메뉴열기('4.7 의 인용');
    await 카드.펼침.항목('인용').click();
    await 글쓰기.인용취소.waitFor();
    await verify('글 인용을 시작하면 「이미지, 영상, 오디오 파일 추가」를 누를 수 없다', await 글쓰기.작성.첨부.isDisabled(), true);
    await verify('인용 중에는 「설문 추가」도 누를 수 없다', await 글쓰기.작성.설문.isDisabled(), true);
  });

  await test.step('인용 중 공개 범위 창을 연다', async () => {
    await 글쓰기.공개범위창열기();
    await 글쓰기.공개범위고르기시도('개인 멘션');
    const 고름 = (await 글쓰기.공개범위선택.innerText()).includes('개인 멘션');
    await verify('인용 중에는 공개 범위 「개인 멘션」을 고를 수 없다', 고름, false);
    await 글쓰기.창.버튼('취소').click();
    await 글쓰기.창.닫힐때까지();
  });

  await test.step('인용 중 다른 글의 「인용」을 누른다', async () => {
    await 카드.카드보이기('오늘 아침 한강 산책길');
    await 카드.부스트메뉴열기('오늘 아침 한강 산책길');
    await 카드.펼침.항목('인용').click();
    await 글쓰기.인용취소.first().waitFor();
    await verify('인용 원글은 한 글만 붙는다', await 글쓰기.인용취소.count(), 1);
  });
});
