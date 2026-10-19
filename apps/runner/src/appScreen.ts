// 폰에 앱을 한 번 띄워 화면을 읽고, 작성 AI 가 요소 주소를 고를 만큼만 남겨 돌려준다 (SPEC 도메인/러너 §5.2 「앱 화면 읽기」)

import { appium주소 } from './appSession.js';

// 첫 연결은 앱 설치까지 해서 9.4초 걸렸다(2026-10-07 실측). 그 여섯 배까지 기다린다
const 열기_제한_ms = 60_000;
const 읽기_제한_ms = 30_000;
const 닫기_제한_ms = 10_000;

// 같은 폰에 연결 둘이 겹치면 뒤 연결이 앞 연결을 가로챈다. 읽는 중에 또 읽지 못하게 한다
let 읽는중 = false;
export const 화면을읽는중인가 = (): boolean => 읽는중;

export interface 앱화면요청 {
  app?: string;
  udid?: string;
}

const 글자뜻: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function 풀기(v: string): string {
  return v.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
    return 글자뜻[e] ?? m;
  });
}

// 속성 값 안에는 `>` 가 그대로 올 수 있어 따옴표 짝을 보고 태그 끝을 찾는다
const 태그 = /<(\/?)([^\s/>]+)((?:\s+[^\s=]+="[^"]*")*)\s*(\/?)>/g;
const 속성 = /([^\s=]+)="([^"]*)"/g;

/**
 * Appium 이 주는 화면 XML(요소 111개에 7만 8천 자)에서 이름표 · 글자 · resource-id · 누를 수 있는지 · 위치만 남긴다.
 * 이름표도 글자도 id 도 없고 누르지도 못하는 껍데기 요소는 줄을 빼되, 자식 들여쓰기는 남은 조상 기준으로 맞춘다
 */
export function 화면을줄인다(xml: string): string {
  const 줄: string[] = [];
  const 조상: boolean[] = [];
  let 머리 = '';
  let 요소수 = 0;
  for (const m of xml.matchAll(태그)) {
    const [, 닫음, 이름, 속성글, 홀로] = m;
    if (닫음 === '/') {
      조상.pop();
      continue;
    }
    const a: Record<string, string> = {};
    for (const p of (속성글 ?? '').matchAll(속성)) a[p[1]!] = 풀기(p[2]!);
    if (이름 === 'hierarchy') {
      머리 = `화면 ${a.width ?? '?'}x${a.height ?? '?'}`;
    } else {
      // 비밀번호 칸은 가려진 글자라도 값으로 보이는 것을 싣지 않는다
      const 글 = a.password === 'true' ? '' : (a.text ?? '');
      const 이름표 = a['content-desc'] ?? '';
      const id = a['resource-id'] ?? '';
      const 누름 = a.clickable === 'true' || a['long-clickable'] === 'true';
      const 남김 = 글 !== '' || 이름표 !== '' || id !== '' || 누름 || a.scrollable === 'true';
      if (남김) {
        요소수 += 1;
        const 칸 = [이름.split('.').pop()!];
        if (글 !== '') 칸.push(`text=${JSON.stringify(글)}`);
        if (이름표 !== '') 칸.push(`desc=${JSON.stringify(이름표)}`);
        if (id !== '') 칸.push(`id=${id}`);
        if (누름) 칸.push('클릭');
        if (a.scrollable === 'true') 칸.push('스크롤');
        if (a.checked === 'true') 칸.push('체크됨');
        if (a.enabled === 'false') 칸.push('꺼짐');
        칸.push(a.bounds ?? '');
        줄.push(`${'  '.repeat(조상.filter(Boolean).length)}${칸.join(' ')}`);
      }
      if (홀로 !== '/') 조상.push(남김);
    }
  }
  return [`${머리} · 요소 ${요소수}개`, ...줄].join('\n');
}

async function 부른다(url: string, init: RequestInit, 제한: number): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(제한) });
  const body = (await res.json().catch(() => null)) as { value?: unknown } | null;
  if (!res.ok) {
    const 까닭 = (body?.value as { message?: string } | undefined)?.message ?? '';
    throw new Error(`Appium 이 HTTP ${res.status} 로 답했다${까닭 === '' ? '' : `: ${까닭}`}`);
  }
  return body?.value;
}

export async function 앱화면을읽는다(req: 앱화면요청, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const raw = env.PLATFORM_APPIUM_URL;
  if (raw === undefined || raw === '') throw new Error('Android 앱 화면을 읽으려면 PLATFORM_APPIUM_URL 이 필요하다');
  const app = req.app ?? env.PLATFORM_APP;
  if (app === undefined || app === '') throw new Error('Android 앱 화면을 읽으려면 PLATFORM_APP 이 필요하다');
  const udid = req.udid ?? env.PLATFORM_DEVICE_UDID;
  const { base, headers } = appium주소(raw);
  const json = { ...headers, 'Content-Type': 'application/json' };

  읽는중 = true;
  let 연결번호: string | undefined;
  try {
    // 케이스가 연결을 여는 것과 같은 설정이다 (kit runtime/app.ts appCapabilities)
    const alwaysMatch = {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app': app,
      ...(udid ? { 'appium:udid': udid } : {}),
    };
    const 열림 = (await 부른다(
      `${base}/session`,
      { method: 'POST', headers: json, body: JSON.stringify({ capabilities: { alwaysMatch } }) },
      열기_제한_ms,
    )) as { sessionId?: string } | undefined;
    연결번호 = 열림?.sessionId;
    if (연결번호 === undefined) throw new Error('Appium 이 연결 번호를 주지 않았다');
    const xml = await 부른다(`${base}/session/${encodeURIComponent(연결번호)}/source`, { headers }, 읽기_제한_ms);
    if (typeof xml !== 'string') throw new Error('Appium 이 화면 글을 주지 않았다');
    return 화면을줄인다(xml);
  } finally {
    try {
      // 안 닫으면 팜의 폰이 기본 60초 붙들린다. 닫기가 실패해도 읽은 결과는 살린다
      if (연결번호 !== undefined) {
        const 닫음 = await fetch(`${base}/session/${encodeURIComponent(연결번호)}`, { method: 'DELETE', headers, signal: AbortSignal.timeout(닫기_제한_ms) });
        if (!닫음.ok) console.error(`[runner] 앱 화면을 읽은 연결을 닫지 못했다: HTTP ${닫음.status}`);
      }
    } catch (err) {
      console.error(`[runner] 앱 화면을 읽은 연결을 닫지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      읽는중 = false;
    }
  }
}
