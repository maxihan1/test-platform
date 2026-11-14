import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 가입하기, 새계정값 } from './helpers/signup.helper.js';
import { 수신함확인화면 } from './pages/inbox-check.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-265',
  name: '가입을 마치면 「수신함 확인하기」 화면에 「{이메일}로 보낸 링크를 클릭해 마스토돈을 시작하세요. 기다리고 있겠습니다.」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 수신함 = new 수신함확인화면(page);
  const 값 = 새계정값();

  await test.step('가입을 마치고 「수신함 확인하기」 화면을 연다', async () => {
    await 한국어로(page);
    await 가입하기(page, 값);
    await 수신함.시계를달고다시열기();
    await verify('「수신함 확인하기」 제목이 보인다', await 수신함.제목.isVisible(), true, { blocker: true });
    await verify(
      '가입을 마치면 「수신함 확인하기」 화면에 「{이메일}로 보낸 링크를 클릭해 마스토돈을 시작하세요. 기다리고 있겠습니다.」가 보인다',
      (await 수신함.안내.innerText()).trim(),
      `${값.이메일}로 보낸 링크를 클릭해 마스토돈을 시작하세요. 기다리고 있겠습니다.`,
    );
  });

  await test.step('「링크를 못 받으셨나요?」를 펼친다', async () => {
    await 수신함.펼치기();
    await verify('「링크를 못 받으셨나요?」 펼침 안에 「확인 링크 다시 보내기」가 보인다', await 수신함.다시보내기.isVisible(), true);
  });

  await test.step('「확인 링크 다시 보내기」를 누른다', async () => {
    await 수신함.대기시간넘기기();
    await 수신함.다시보내기누르기();
    const 떴다 = await 수신함.보냄안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('다시 보낸 뒤 「확인 링크가 담긴 이메일이 몇 분 안에 도착할것입니다!」가 보인다', 떴다, true);
  });
});
