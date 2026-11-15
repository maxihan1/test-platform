import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 개인정보화면까지 } from './helpers/signup-flow.helper.js';
import { 개인정보화면 } from './pages/privacy-consent.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-046',
  name: '「당신의 개인정보」 화면에 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」와 「Mastodon for Android Privacy Policy」 · 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: z.object({
    안내: z.string().describe('개인정보 안내 첫 문장').default('마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 개인정보 = new 개인정보화면(driver);

  await test.step('「당신의 개인정보」 화면을 연다', async () => {
    await 개인정보화면까지(driver);
    await verify('「당신의 개인정보」 화면 안내 글이 보인다', await 개인정보.그려질때까지(), true, { blocker: true });
  });

  await test.step('「당신의 개인정보」 화면을 확인한다', async () => {
    const 안내 = await verify('안내 글에 기대 문구가 들어 있다', (await 개인정보.글('안내')).includes(expected.안내), true);
    const 정책 = await verify('「Mastodon for Android Privacy Policy」가 보인다', await 개인정보.글('앱정책제목'), 'Mastodon for Android Privacy Policy');
    const 요약 = await verify('「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다', await 개인정보.글('앱정책요약'), '요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.');
    await verify('「당신의 개인정보」 화면에 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」와 「Mastodon for Android Privacy Policy」 · 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다', 안내 && 정책 && 요약, true);
  });
});
