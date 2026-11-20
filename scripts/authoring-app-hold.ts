// 앱 작성이 잡은 폰을 작성이 끝날 때까지 쥐게 팜 잡기를 늘린다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 7 · APP-F4-06)
// appium-cli hold 는 30 · 60 · 120분만 받는다. 놓았다 다시 잡으면 팜이 앱 데이터를 지우고 그 사이 다른 실행이 폰을 가져갈 수 있어 늘린다
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const 폰번호꼴 = /^[A-Za-z0-9._:-]{1,64}$/;

/** 잡은 폰 기록 이름 — held 는 AI 가, held-<번호> 는 폰 돌려 보기가 나눠 돌리려고 더 잡은 폰이다. 폴더가 보통 폴더가 아니면 null */
export function 잡은기록들(폴더: string): string[] | null {
  try {
    if (!lstatSync(폴더).isDirectory()) return null;
    return readdirSync(폴더).filter((n) => n === 'held' || /^held-[A-Za-z0-9._:-]{1,64}$/.test(n));
  } catch {
    return [];
  }
}

/** 자식이 쓴 기록 — 링크는 따라가지 않고 폰 번호 꼴만 받는다. 못 받으면 까닭 */
export function 기록읽기(기록: string): { serial: string; mtimeMs: number } | { 까닭: string } | null {
  try {
    const 정보 = lstatSync(기록);
    if (!정보.isFile() || 정보.size > 100) return { 까닭: '보통 파일이 아니라' };
    const serial = readFileSync(기록, 'utf8').trim();
    return 폰번호꼴.test(serial) ? { serial, mtimeMs: 정보.mtimeMs } : { 까닭: '폰 번호 꼴이 아니라' };
  } catch {
    return null;
  }
}

/** 작성(자료 폴더) · 폰마다 마지막으로 늘린 때. 팜은 끝나기 10분 전부터만 30분을 더하므로 늘린 때부터 30분은 산다 */
const 늘린때 = new Map<string, number>();
const 열쇠 = (자료: string, serial: string) => `${자료}\n${serial}`;
export const 마지막늘림 = (자료: string | undefined, serial: string): number => (자료 === undefined ? 0 : (늘린때.get(열쇠(자료, serial)) ?? 0));
export const 늘림잊기 = (자료: string | undefined, serial: string): void => void (자료 !== undefined && 늘린때.delete(열쇠(자료, serial)));

/**
 * 한 번 — 작업 폴더 `.appium-cli/held*` 의 폰마다 팜 `/hold/extend`. 409(아직 10분 넘게 남음 · 이미 풀림)는 조용히 넘긴다.
 * 던지지 않는다 — 못 늘리면 30분 뒤 팜이 풀고, AI 의 다음 명령이 「잡은 폰 없음」으로 알게 된다
 */
export async function 잡기한번늘리기(트리: string, 팜: string, 토큰: string | undefined, 번호: number, 자료: string, 부르기: typeof fetch = fetch, 지금 = Date.now()): Promise<void> {
  const 폴더 = join(트리, '.appium-cli');
  for (const 이름 of 잡은기록들(폴더) ?? []) {
    const 기록 = 기록읽기(join(폴더, 이름));
    if (기록 === null || '까닭' in 기록) continue;
    try {
      const res = await 부르기(`${팜}/api/devices/${encodeURIComponent(기록.serial)}/hold/extend`, {
        method: 'POST',
        headers: 토큰 ? { authorization: `Bearer ${토큰}` } : {},
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) 늘린때.set(열쇠(자료, 기록.serial), 지금);
      else if (res.status !== 409) console.error(`[작성] ${번호}번 — 잡아 둔 폰 ${기록.serial} 을 더 쥐지 못했다: HTTP ${res.status}`);
    } catch (err) {
      console.error(`[작성] ${번호}번 — 잡아 둔 폰 ${기록.serial} 을 더 쥐지 못했다: ${err instanceof Error ? err.name : '알 수 없는 오류'}`);
    }
  }
}

// 팜은 끝나기 10분 전부터만 늘려 준다 — 5분마다 부르면 그 창을 놓치지 않는다
const 늘리기_ms = 5 * 60_000;

/** 자식이 도는 동안(세션 사이 · 크레딧→구독 이어 띄우기 포함) 5분마다 늘린다 — 끄는 함수를 돌려준다. 토큰은 부를 때마다 받는다(30분마다 갈아 끼운다) */
export function 잡기늘리기(트리: string, 팜: string, 토큰: () => string | undefined, 번호: number, 자료: string): () => void {
  const 타이머 = setInterval(() => void 잡기한번늘리기(트리, 팜, 토큰(), 번호, 자료), 늘리기_ms);
  return () => clearInterval(타이머);
}
