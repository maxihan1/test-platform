// 서비스 가이드 지금 판을 자료 폴더 guide/ 에 받아 둔다 — 자식이 서비스 사정을 알고 케이스를 쓰게 (도메인/작성 §3.6 「★ 서비스 가이드」 「에이전트가 읽는다」)
// 기대값의 근거가 아니다 — 자식 지침(tpx-author references/guide.md)이 그렇게 읽는다

import { chownSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

import { 글자인가, 자료계획 } from './authoring-assets.js';
import { 인증헤더, 한번더건다, 부른다 } from './authoring-io.js';
import { 거절말고 } from './authoring-prd-io.js';
import { 비밀번호꼴가리기 } from './authoring-prd.js';

export interface 가이드 {
  version: number;
  intro: string;
  policy: string;
  rules: string;
  files: { id: number; name: string; section: string }[];
}

const 구획이름: Record<string, string> = { intro: '서비스 소개', policy: '정책', rules: '프로젝트 규칙' };

export const 가이드폴더 = (자료: string): string => join(자료, 'guide');

/** 에이전트 통로 응답을 믿지 않고 모양을 본다. 틀리면 null — 가이드 없이 간다 */
export function 가이드읽기(몸: unknown): 가이드 | null {
  const g = 몸 as Partial<가이드> | null;
  if (typeof g?.version !== 'number' || !Number.isInteger(g.version) || g.version < 0) return null;
  if (typeof g.intro !== 'string' || typeof g.policy !== 'string' || typeof g.rules !== 'string' || !Array.isArray(g.files)) return null;
  const 파일들 = g.files.filter((f) => Number.isInteger(f?.id) && typeof f?.name === 'string' && typeof f?.section === 'string');
  return 파일들.length === g.files.length ? { version: g.version, intro: g.intro, policy: g.policy, rules: g.rules, files: 파일들 } : null;
}

type 첨부줄 = { 구획: string; 이름: string; 자리: string | null; 까닭?: string };

/**
 * `guide/guide.md` — 구획 글 셋과 첨부 목록. 첫 줄이 판 번호다(저장소 요약 첫 줄과 같은 꼴 — 자식이 견준다).
 * 첨부는 자식이 읽을 자리와 원래 이름을 적는다. 못 읽은 첨부는 까닭을 적어 자식이 결과 요약 「못 읽은 자료」에 옮긴다
 */
export function 가이드글(g: 가이드, 첨부: 첨부줄[]): string {
  const 구획 = (['intro', 'policy', 'rules'] as const).flatMap((k) => {
    const 줄들 = 첨부.filter((c) => c.구획 === k).map((c) => (c.자리 === null ? `- 「${c.이름}」 — 못 읽었다: ${c.까닭 ?? ''}` : `- ${c.자리}  (원래 이름: ${c.이름})`));
    return [`## ${구획이름[k]}`, '', g[k].trim() === '' ? '(글 없음)' : g[k].trim(), ...(줄들.length === 0 ? [] : ['', '첨부:', ...줄들]), ''];
  });
  return [`<!-- guide-version: ${String(g.version)} -->`, `# 서비스 가이드 (판 ${String(g.version)})`, '', ...구획].join('\n');
}

/** 첨부를 글자로 바꾼다 — 부르는 쪽이 자식 uid · 토큰 없는 환경으로 돌린다(작성 자료와 같은 손) */
export type 바꾸기 = (변환: { 명령: string; 인자: string[] }, 폴더: string) => { ok: boolean; 까닭: string };

const utf8 = new TextDecoder('utf-8', { fatal: true });

/** 글자 첨부의 「비밀번호: 값」 꼴을 가린다. 그림 · PDF · UTF-8 아닌 것은 부수지 않게 건너뛴다(먼저가리기와 같다) */
const 가린다 = (자리: string): void => {
  const 몸 = readFileSync(자리);
  if (!글자인가(몸)) return;
  let 글: string;
  try {
    글 = utf8.decode(몸);
  } catch {
    return;
  }
  const 가림 = 비밀번호꼴가리기(글);
  if (가림 !== 글) writeFileSync(자리, 가림);
};

/**
 * 자식을 띄우기 전에 부른다. 받은 판 번호를 돌려준다 — 0 이면 가이드가 없거나 못 받았다(작성은 간다, 서비스 지도와 같다).
 * 이어받은 폴더면 앞 자식이 심은 것이 있을 수 있어 `guide/` 를 지우고 새로 만든다. 계정 비밀번호는 뒤의 먼저가리기가 자료 폴더째 가린다 —
 * 여기서는 「비밀번호: 값」 꼴만 가린다(계정에 없는 비밀번호). 워드 원본은 글자로 바꾼 뒤 지운다 — 옆에 있으면 자식이 풀어 본다
 */
export async function 가이드받기(
  서버: { 주소기지: string; 토큰: string },
  서비스: string,
  번호: number,
  자료: string,
  바꾸기: 바꾸기,
  자식: { uid: number; gid: number } | null,
  플랫폼: string = process.platform,
): Promise<number> {
  const 폴더 = 가이드폴더(자료);
  rmSync(폴더, { recursive: true, force: true });
  try {
    const 답 = await 부른다(서버.주소기지, 서버.토큰, `/authoring/requests/${String(번호)}/guide?service=${encodeURIComponent(서비스)}`);
    const g = 답.status === 200 ? 가이드읽기(답.몸) : null;
    if (g === null) {
      console.error(`[작성] ${번호}번 — 서비스 가이드를 못 받았다(작성은 간다): ${답.status === 200 ? '모양이 틀리다' : `서버 ${답.status}`}`);
      return 0;
    }
    if (g.version === 0) return 0;
    mkdirSync(폴더, { mode: 0o755 });
    // 바꾸기는 자식 uid 로 돌아 이 폴더에 글자본을 쓴다
    if (자식 !== null) chownSync(폴더, 자식.uid, 자식.gid);
    const 계획 = 자료계획(g.files.map((f, i) => ({ id: f.id, position: i, kind: 'FILE' as const, name: f.name, figmaUrl: null })), 폴더, 플랫폼);
    const 첨부: 첨부줄[] = [];
    for (const [i, c] of 계획.entries()) {
      if (c.kind !== 'FILE') continue;
      const 구획 = g.files[i]!.section;
      // 서버의 pandoc 은 옛 워드를 못 읽는다 — 작성 자료는 실패로 끝내지만 가이드는 곁 자료라 적고 간다
      if (플랫폼 !== 'darwin' && extname(c.받을자리) === '.doc') {
        첨부.push({ 구획, 이름: c.name, 자리: null, 까닭: '옛 워드(.doc)라 서버가 못 읽는다' });
        continue;
      }
      const 받음 = await 한번더건다(() =>
        fetch(`${서버.주소기지}/api/authoring/requests/${String(번호)}/guide/files/${String(c.id)}?service=${encodeURIComponent(서비스)}`, {
          headers: 인증헤더(서버.토큰),
          signal: AbortSignal.timeout(120_000),
        }),
      );
      if (!받음.ok) {
        첨부.push({ 구획, 이름: c.name, 자리: null, 까닭: `서버 ${받음.status}` });
        continue;
      }
      writeFileSync(c.받을자리, Buffer.from(await 받음.arrayBuffer()), { mode: 0o644, flag: 'wx' });
      if (c.변환 !== null) {
        const 바꾼것 = 바꾸기(c.변환, 폴더);
        rmSync(c.받을자리, { force: true });
        if (!바꾼것.ok) {
          rmSync(c.읽을자리, { force: true });
          첨부.push({ 구획, 이름: c.name, 자리: null, 까닭: `글자로 못 바꿨다 — ${바꾼것.까닭}` });
          continue;
        }
      }
      가린다(c.읽을자리);
      첨부.push({ 구획, 이름: c.name, 자리: c.읽을자리 });
    }
    writeFileSync(join(폴더, 'guide.md'), 비밀번호꼴가리기(가이드글(g, 첨부)), { mode: 0o644, flag: 'wx' });
    return g.version;
  } catch (err) {
    const 까닭 = 거절말고(err);
    console.error(`[작성] ${번호}번 — 서비스 가이드를 못 받았다(작성은 간다): ${까닭}`);
    rmSync(폴더, { recursive: true, force: true });
    return 0;
  }
}
