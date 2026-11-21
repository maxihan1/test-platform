// 폰에 깔린 앱이 이번에 넘긴 빌드인지 보고, 아니면 판 번호와 상관없이 지우고 다시 깐다 (도메인/러너 §5.2 「빌드가 바뀌면 다시 깔기」)

import { createHash } from 'node:crypto';

type 실행기 = (script: string, args: Record<string, unknown>) => Promise<unknown>;

export type 빌드확인 = '그대로' | '방금깖' | '다시깖' | '못봄';

// 깐 시각은 초 단위로 잘려 나온다 — 그만큼만 봐준다. 넓히면 연결 직전에 앞 실행이 깐 옛 빌드를 이 연결이 깐 것으로 믿는다
const 여유_ms = 2_000;

/** 빌드를 가리는 글 — 서명 주소의 기한 · 서명(exp · sig)은 시간마다 바뀌어 뺀다. 같은 빌드면 같은 글이다 */
export function 빌드열쇠(앱: string): string {
  try {
    const 주소 = new URL(앱);
    주소.searchParams.delete('exp');
    주소.searchParams.delete('sig');
    return 주소.toString();
  } catch {
    return 앱;
  }
}

const 쪽지자리 = (꾸러미: string): string => `/data/local/tmp/qahub-app-${꾸러미}`;
// 폰 셸 한 줄에 그대로 실린다 — 서명 주소를 폰에 남기지 않게 해시로 적고, 시각은 숫자 · - · : · 빈칸뿐이다
const 열쇠글 = (앱: string): string => createHash('sha256').update(빌드열쇠(앱)).digest('hex').slice(0, 16);
const 셸 = (실행: 실행기, command: string, args: string[]): Promise<string> => 실행('mobile: shell', { command, args }).then((v) => String(v ?? ''));
const 깐시각 = async (실행: 실행기, 꾸러미: string): Promise<string | null> =>
  /lastUpdateTime=(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)/.exec(await 셸(실행, 'dumpsys', ['package', 꾸러미]))?.[1] ?? null;
/** 폰에 쪽지를 쓴다 — 케이스 안에서 앱을 다시 깐 부품(lifecycleParts)도 부른다. 못 써도 던지지 않는다(다음 연결이 한 번 더 깔 뿐이다) */
export async function 쪽지쓰기(실행: 실행기, 꾸러미: string, 앱: string): Promise<void> {
  try {
    const 깐 = await 깐시각(실행, 꾸러미);
    if (깐 !== null) await 셸(실행, 'echo', [`'${열쇠글(앱)} ${깐}'`, '>', 쪽지자리(꾸러미)]);
  } catch {
    // 위 설명대로 삼킨다
  }
}

// 폰의 현지 시각끼리 견주므로 둘 다 UTC 로 읽어도 시간대가 지워진다
const 초 = (글: string): number => Date.parse(`${글.replace(' ', 'T')}Z`);

/**
 * 연결을 연 뒤 켜기 전에 부른다. 폰에 남긴 쪽지(빌드 해시 + 깐 시각)와 지금 깔린 앱의 깐 시각을 견준다.
 * - 쪽지가 이번 빌드이고 깐 시각도 같다 → 그대로(같은 실행의 다음 항목 — 데이터를 둔다)
 * - 깐 시각이 연결을 연 뒤이고 쪽지의 깐 시각과 다르다 → 이 연결이 넘긴 APK 를 막 깔았다. 쪽지만 쓴다
 * - 그 밖(쪽지가 없다 · 다른 빌드 · 그사이 누가 다시 깔았다) → 지우고 넘긴 APK 를 깐다. Appium 은 판 번호가 같거나 낮으면 안 깐다
 * 폰 셸을 못 쓰는 팜(adb_shell 안 켬)이면 알리고 지금처럼 켠다. 다시 깔기가 실패하면 던진다 — 앱이 지워진 채로 돌면 안 된다
 */
export async function 빌드맞추기(실행: 실행기, 꾸러미: string, 앱: string, 연결걸린_ms: number): Promise<빌드확인> {
  const 열쇠 = 열쇠글(앱);
  let 지금깐: string | null;
  let 쪽지: string;
  let 폰지금: string;
  try {
    지금깐 = await 깐시각(실행, 꾸러미);
    폰지금 = (await 셸(실행, 'date', ['+%Y-%m-%dT%H:%M:%S'])).trim();
    쪽지 = (await 셸(실행, 'cat', [쪽지자리(꾸러미), '2>/dev/null', '||', 'true'])).trim();
  } catch (err) {
    console.error(`[kit] 폰에 깔린 빌드를 확인하지 못하고 켠다 — Appium 을 --allow-insecure=uiautomator2:adb_shell 로 켜야 한다: ${err instanceof Error ? err.message : String(err)}`);
    return '못봄';
  }
  if (지금깐 === null) {
    console.error(`[kit] 폰에 깔린 빌드를 확인하지 못하고 켠다 — ${꾸러미} 의 깐 시각을 못 읽었다`);
    return '못봄';
  }
  if (쪽지 === `${열쇠} ${지금깐}`) return '그대로';
  // 쪽지의 깐 시각과 같으면 이 연결은 안 깔았다 — 다른 빌드의 쪽지를 남긴 앞 실행이 방금 깐 것이다
  const 막깖 = 초(폰지금) - 초(지금깐) <= 연결걸린_ms + 여유_ms && !쪽지.endsWith(` ${지금깐}`);
  if (!막깖) {
    await 실행('mobile: removeApp', { appId: 꾸러미 }).catch((err: unknown) => {
      throw new Error(`폰에 깔린 앱이 이번 빌드가 아니라 지우려 했는데 못 지웠다 — ${err instanceof Error ? err.message : String(err)}`);
    });
    try {
      await 실행('mobile: installApp', { appPath: 앱 });
    } catch (err) {
      // 앱 값은 서명 주소일 수 있다 — 실행 기록 · 리포트에 남는 오류 글에서 가린다 (lifecycleParts.ts 깔기와 같다)
      const 글 = (err instanceof Error ? err.message : String(err)).split(앱).join('<앱 파일>').replace(/([?&]sig=)[^&\s'"]+/g, '$1…');
      throw new Error(`폰에 깔린 앱이 이번 빌드가 아니라 지웠는데 다시 깔지 못했다 — ${글}`);
    }
    console.error(`[kit] 폰에 깔린 앱이 이번 빌드가 아니라 지우고 다시 깔았다(${쪽지 === '' ? '확인 기록 없음' : '다른 빌드 · 그사이 다시 깔림'})`);
  }
  await 쪽지쓰기(실행, 꾸러미, 앱);
  return 막깖 ? '방금깖' : '다시깖';
}
