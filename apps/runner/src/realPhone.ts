// 실제 폰 Chrome 항목 — 자식 환경 · VISION 기기 칸 · 실시간 logcat 받기 · 폰 증적 자리 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
// VISION 은 Appium 연결에만 영상 · logcat 을 남긴다. Chrome 연결은 러너가 직접 받는다 — 영상은 kit 이 Playwright 로 찍고 logcat 은 여기서 VISION 실시간 로그로 받는다 (2026-11-03 사용자 시작 질문)

import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { DeviceInfo, ExecuteRequest, ItemStatus } from '@platform/kit';
import { FARM_EVIDENCE_DIR } from '@platform/kit';

type 폰요청 = Pick<ExecuteRequest, 'platform' | 'cdpUrl' | 'udid' | 'farmToken'>;

// 자식이 여기에 찍고 러너가 판정을 본 뒤 팜 증적 폴더로 옮기거나 지운다. admin 은 farm 폴더만 본다
export const 폰영상 = 'phone-video.webm';
export const 폰로그 = 'phone-logcat.txt';
const 옮길이름: ReadonlyArray<readonly [string, string]> = [[폰영상, 'video-1.webm'], [폰로그, 'logcat.txt']];

const VISION_제한_ms = 10_000;
const 알림 = (말: string, err: unknown): void => console.error(`[runner] ${말}: ${err instanceof Error ? err.message : String(err)}`);

export const 실제폰인가 = (req: 폰요청): req is 폰요청 & { cdpUrl: string; udid: string } =>
  req.platform === 'mobile' && req.cdpUrl !== undefined && req.udid !== undefined;

/** cdpUrl(wss://<VISION>[/wd/hub]/api/devices/<serial>/chrome/cdp)에서 VISION 주소를 뗀다 — 그 폰을 잡은 곳이 기기 목록 · 로그도 준다 */
export function 팜주소(cdpUrl: string): string {
  const u = new URL(cdpUrl);
  const 자리 = u.pathname.indexOf('/api/devices/');
  return `${u.protocol === 'wss:' ? 'https:' : 'http:'}//${u.host}${자리 < 0 ? '' : u.pathname.slice(0, 자리)}`;
}

const 머리 = (req: 폰요청): Record<string, string> => {
  const 토큰 = req.farmToken ?? process.env.PLATFORM_APPIUM_TOKEN;
  return 토큰 ? { Authorization: `Bearer ${토큰}` } : {};
};

/**
 * 자식 환경 — 늘 적는다(러너를 켠 셸의 값을 안 물려받게). 실제 폰이면 장면 파일을 비운다 — 그 화면은 VISION 이 보인다.
 * 늦추기(PLATFORM_SLOW_MO)는 그대로 두면 kit 이 연결 옵션으로 넘긴다 (§5.2 「테스트 모드 — 실시간 장면」)
 */
export function 실제폰환경(req: 폰요청, 폴더: string, 증적: boolean): Record<string, string | undefined> {
  if (!실제폰인가(req)) return { PLATFORM_CDP_URL: '', PLATFORM_PHONE_VIDEO: '' };
  return {
    PLATFORM_CDP_URL: req.cdpUrl,
    PLATFORM_APPIUM_TOKEN: req.farmToken ?? process.env.PLATFORM_APPIUM_TOKEN,
    PLATFORM_PHONE_VIDEO: 증적 ? join(폴더, 폰영상) : '',
    PLATFORM_LIVE_FILE: '',
  };
}

const 글자 = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** 모델 · Android 판은 VISION 기기 목록의 그 폰 줄에서, Chrome 판은 자식이 붙은 브라우저에서 온다. 못 읽은 칸은 null — 판정과 상관없다 */
export async function 폰기기(req: 폰요청 & { cdpUrl: string; udid: string }, 받은: DeviceInfo | undefined): Promise<DeviceInfo> {
  let 줄: { model?: unknown; osVersion?: unknown } | undefined;
  try {
    const res = await fetch(`${팜주소(req.cdpUrl)}/api/devices`, { headers: 머리(req), signal: AbortSignal.timeout(VISION_제한_ms) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const 값 = (await res.json()) as { value?: { devices?: Array<{ serial?: unknown; model?: unknown; osVersion?: unknown }> } };
    줄 = 값.value?.devices?.find((d) => d.serial === req.udid);
  } catch (err) {
    알림('VISION 에서 폰 모델을 못 읽었다', err);
  }
  return { model: 글자(줄?.model), osVersion: 글자(줄?.osVersion), appVersion: null, browser: 받은?.browser ?? null };
}

interface 로그줄 {
  t?: number;
  pid?: number;
  tid?: number;
  level?: string;
  tag?: string;
  msg?: string;
  end?: string;
}

// logcat threadtime 꼴과 비슷하게 — 시각은 VISION 이 고친 팜 PC 시계다
export function 로그한줄(줄: string): string {
  let l: 로그줄;
  try {
    l = JSON.parse(줄) as 로그줄;
  } catch {
    return 줄;
  }
  if (l.end !== undefined) return `# VISION 이 로그를 닫았다: ${l.end}`;
  const 시각 = typeof l.t === 'number' ? new Date(l.t).toISOString() : '-';
  return `${시각} ${String(l.pid ?? '-')} ${String(l.tid ?? '-')} ${l.level ?? '-'} ${l.tag ?? ''}: ${l.msg ?? ''}`;
}

/**
 * 그 폰 Chrome 줄만 잡은 때부터 받는다(?app=1 — VISION 이 Chrome 을 켤 때 잡기의 앱으로 올린다). 실행 내내 열어 두고 끝나면 닫는다.
 * VISION 은 이 길을 화면용이라 줄 모양이 바뀔 수 있다고 적었다 — 못 읽는 줄은 원문 그대로 적는다. 무엇이 실패해도 던지지 않는다
 */
export function 폰로그를받는다(req: 폰요청 & { cdpUrl: string; udid: string }, 파일: string): () => Promise<void> {
  const 끊기 = new AbortController();
  const 받기 = (async () => {
    const res = await fetch(`${팜주소(req.cdpUrl)}/api/devices/${encodeURIComponent(req.udid)}/logcat?app=1`, { headers: 머리(req), signal: 끊기.signal });
    if (!res.ok || res.body === null) throw new Error(`HTTP ${res.status}`);
    await mkdir(dirname(파일), { recursive: true });
    const 쓰기 = createWriteStream(파일);
    try {
      let 남은 = '';
      const 읽개 = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (let 조각 = await 읽개.read(); !조각.done; 조각 = await 읽개.read()) {
        const 줄들 = (남은 + 조각.value).split('\n');
        남은 = 줄들.pop() ?? '';
        for (const 줄 of 줄들) if (줄 !== '') 쓰기.write(`${로그한줄(줄)}\n`);
      }
    } finally {
      await new Promise<void>((끝) => 쓰기.end(끝));
    }
  })().catch((err: unknown) => {
    if (!끊기.signal.aborted) 알림('VISION 에서 폰 logcat 을 못 받았다', err);
  });
  return async () => {
    // 마지막 동작의 줄이 VISION 을 거쳐 오는 틈
    await new Promise((끝) => setTimeout(끝, 500));
    끊기.abort();
    await 받기;
  };
}

/** 통과면 지우고, 아니면 admin 이 보는 팜 증적 폴더로 옮긴다 — Android 항목과 같은 규칙이다(통과 못 한 항목만 남긴다) */
export async function 폰증적을둔다(폴더: string, status: ItemStatus): Promise<void> {
  for (const [이름, 둘이름] of 옮길이름) {
    const 원래 = join(폴더, 이름);
    try {
      if (status === 'PASS' || (await stat(원래)).size === 0) {
        await rm(원래, { force: true });
        continue;
      }
      await mkdir(join(폴더, FARM_EVIDENCE_DIR), { recursive: true });
      await rename(원래, join(폴더, FARM_EVIDENCE_DIR, 둘이름));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') 알림(`폰 증적을 옮기지 못했다 (${이름})`, err);
    }
  }
}
