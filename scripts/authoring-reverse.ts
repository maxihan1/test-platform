// 역방향 작성의 에이전트 쪽 순수 판정 — 집을 때 재대조 · 자식 환경 · 차이 파일 · 비밀번호 원문 · 역기획서 변환 (도메인/작성 §3.6 「★ 역방향」)
// 껍데기(authoring-run · authoring-upload)가 부른다. 여기는 I/O 가 없다

/** 집기 응답의 `target` (도메인/작성 §7). 대조 행이면 줄이 지워졌어도 오고 그때 서버·계정 칸이 null 이다 */
export interface 대상 {
  env: string;
  baseUrl: string | null;
  startUrl?: string | null;
  loginId?: string | null;
  loginPassword?: string | null;
}

/**
 * 비밀번호가 이보다 짧으면 새는지 검사할 수 없다 — 짧은 글자는 아무 케이스 글에나 우연히 걸린다.
 * 그렇다고 문턱 아래를 안 보면 짧은 비밀번호는 검사 없이 나간다. 그래서 **돌리지 않는다** (2026-09-26 게이트 1)
 */
const 비밀최소 = 4;

function 주소(글: unknown): URL | null {
  if (typeof 글 !== 'string') return null;
  try {
    const u = new URL(글);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

/**
 * 집을 때 다시 대조한다 — 만든 뒤 설정이 바뀔 수 있다 (§7 집기 ★). 막으면 사유, 아니면 null.
 * **사유에 계정 값을 싣지 않는다** — 사유는 화면과 서버 기록에 남는다
 */
export function 대상점검(t: 대상 | undefined): string | null {
  if (t === undefined) return null;
  const 서버 = 주소(t.baseUrl);
  if (서버 === null) return `대상 서버 「${t.env}」 줄이 없어졌거나 주소가 http·https 가 아니다 — 설정을 확인하고 새 요청으로 넣어라`;
  if ((t.loginId ?? '') === '' || (t.loginPassword ?? '') === '') {
    return `대상 서버 「${t.env}」 에 테스트 계정이 빠졌다 — 설정 > 서비스에서 넣고 새 요청으로 넣어라`;
  }
  if ((t.loginPassword ?? '').length < 비밀최소) {
    return `테스트 계정 비밀번호가 ${비밀최소}자보다 짧아 올리는 글에 새는지 검사할 수 없다 — 더 긴 비밀번호로 바꿔라`;
  }
  if (t.startUrl !== null && t.startUrl !== undefined && 주소(t.startUrl)?.origin !== 서버.origin) {
    return '시작 주소가 대상 서버와 어긋난다(도메인·포트) — 설정이 바뀌었으면 새 요청으로 넣어라';
  }
  return null;
}

/** 자식에게 넘길 환경 변수. **값을 프롬프트·인자에 싣지 않는다** — 셸 글자에 끼우면 해석되고 `ps` 에 보인다 (§7 ★) */
export function 대상환경(t: 대상): Record<string, string> {
  return {
    TARGET_ENV: t.env,
    TARGET_BASE_URL: t.baseUrl ?? '',
    ...(t.startUrl ? { TARGET_START_URL: t.startUrl } : {}),
    TARGET_LOGIN_ID: t.loginId ?? '',
    TARGET_LOGIN_PASSWORD: t.loginPassword ?? '',
  };
}

/**
 * 줄 프롬프트에 덧붙이는 역방향 절. **계정 값은 싣지 않는다** — 환경 변수 이름만 알려 준다.
 * 절차의 정본은 `tpx-author` 스킬의 `references/reverse.md` 다. 여기는 그 파일을 열게 하고 이번 건의 자리만 준다
 */
export function 역방향절(입력: { 화면만: boolean; 산출물폴더: string; 요청번호: number }): string[] {
  return [
    '',
    '--- 역방향 ---',
    `이 요청은 작성 요청 ${String(입력.요청번호)} 이다 — 미확정 꼬리표의 사유에 이 번호를 싣는다.`,
    입력.화면만
      ? '이 요청은 **화면만**이다 — 기획서가 없다. 시작 주소의 화면과 바로 이어지는 한 칸을 훑어 케이스(전부 미확정)와 역기획서를 만들어라.'
      : '이 요청은 **실제 화면과 대조**다 — 기획서와 대상 서버의 실제 화면을 맞대 보고 차이마다 처리해라.',
    '- 절차는 tpx-author 스킬의 references/reverse.md 를 Read 로 열어 그대로 따라라.',
    '- 대상 서버·시작 주소·테스트 계정은 환경 변수 TARGET_ENV · TARGET_BASE_URL · TARGET_START_URL(없을 수 있다) · TARGET_LOGIN_ID · TARGET_LOGIN_PASSWORD 에 있다.',
    '- 계정 값을 글·명령 인자·출력에 펼치지 마라. 스크립트 안에서 process.env 로 읽어라.',
    `- 산출물 폴더는 \`${입력.산출물폴더}\` 다. 차이 목록은 diffs.json${입력.화면만 ? ', 역기획서 원고는 reverse-spec.md' : ''} 로 거기에 써라.`,
  ];
}

/** 차이 한 줄 (§7 `finish` 의 `result.diffs[]`) */
export interface 차이 {
  no: string;
  kind: 'DIFFERENT' | 'SCREEN_ONLY' | 'DOC_ONLY';
  where: string | null;
  doc: string | null;
  screen: string | null;
  tcId: string | null;
  marked: boolean;
  markError: string;
  /**
   * 표시 자리 — 자식이 적은 자료 번호 · 기획서 문장 · 피그마 노드. **서버로는 안 보낸다**(`보낼차이`).
   * 모양이 틀리면 null — 표시만 못 할 뿐 차이는 멀쩡하다
   */
  표시?: { asset: number | null; anchor: string | null; node: string | null };
}

const 문장상한 = 300;

function 표시자리(d: Record<string, unknown>): NonNullable<차이['표시']> {
  const asset = typeof d.asset === 'number' && Number.isSafeInteger(d.asset) && d.asset > 0 ? d.asset : null;
  const anchor = typeof d.anchor === 'string' && d.anchor.trim() !== '' ? d.anchor.slice(0, 문장상한) : null;
  // 피그마 노드는 12:34 · 12-34 둘 다 온다. 숫자 둘만 받는다 — 요청 본문에 그대로 실린다
  const 맞음 = typeof d.node === 'string' ? /^(\d{1,10})[:-](\d{1,10})$/.exec(d.node) : null;
  return { asset, anchor, node: 맞음 === null ? null : `${맞음[1]}:${맞음[2]}` };
}

/** 서버로 보낼 모양 — 표시 자리를 뺀다 (§7 `finish` 의 `result.diffs[]`) */
export function 보낼차이(diffs: 차이[]): Omit<차이, '표시'>[] {
  return diffs.map(({ 표시: _자리, ...나머지 }) => 나머지);
}

const 종류들 = new Set(['DIFFERENT', 'SCREEN_ONLY', 'DOC_ONLY']);
const 글상한 = 2000;
const 줄상한 = 500;

function 글칸(값: unknown): string | null {
  return typeof 값 === 'string' ? 값.slice(0, 글상한) : null;
}

/**
 * 자식이 쓴 차이 파일(`out/diffs.json`)을 좁혀 받는다. 파일이 없으면(`null`) 빈 목록.
 *
 * **서버가 모양을 안 본다**(2026-09-26 게이트 1) — 자식이 아무 키·거대한 글을 넣어도 막을 곳이 여기뿐이다.
 * 허용한 칸만 남기고 종류는 셋만. **표시는 ③-2 전까지 안 하므로 `marked` 는 에이전트가 거짓으로 박는다** —
 * 자식이 「표시했다」고 적어도 믿지 않는다
 */
export function 차이정리(글: string | null): { diffs: 차이[] } | { 사유: string } {
  if (글 === null) return { diffs: [] };
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return { 사유: '차이 목록 파일(diffs.json)이 JSON 이 아니다' };
  }
  if (!Array.isArray(값)) return { 사유: '차이 목록 파일(diffs.json)이 배열이 아니다' };
  if (값.length > 줄상한) return { 사유: `차이 목록이 ${줄상한}줄을 넘는다` };
  const diffs: 차이[] = [];
  for (const 줄 of 값) {
    if (typeof 줄 !== 'object' || 줄 === null || Array.isArray(줄)) return { 사유: '차이 목록에 객체가 아닌 줄이 있다' };
    const d = 줄 as Record<string, unknown>;
    const no = 글칸(d.no);
    if (no === null || no === '' || typeof d.kind !== 'string' || !종류들.has(d.kind)) {
      return { 사유: '차이 목록 줄에 번호(no)나 종류(kind)가 없거나 틀렸다' };
    }
    diffs.push({
      no,
      kind: d.kind as 차이['kind'],
      where: 글칸(d.where),
      doc: 글칸(d.doc),
      screen: 글칸(d.screen),
      tcId: 글칸(d.tcId),
      marked: false,
      markError: '표시는 아직 안 한다',
      표시: 표시자리(d),
    });
  }
  return { diffs };
}

/** 글 어디에든 비밀번호 원문이 있나. 짧은 비밀번호는 집을 때 이미 걸렀다(`대상점검`) */
export function 계정섞였나(글들: string[], 비밀: string | null | undefined): boolean {
  if (비밀 === null || 비밀 === undefined || 비밀 === '') return false;
  return 글들.some((글) => 글.includes(비밀));
}

/**
 * push 전에 올릴 글 전부를 본다 (§3.6 「남는 한계」 — 올릴 파일 · result(diffs) · 케이스 diff · PR 본문).
 * 역기획서 `.docx` 는 바꾼 뒤 한 번 더 본다(`되읽기인자`) — 원고만 보면 변환이 끌어온 것을 못 본다
 */
export function 올리기전검사(
  글들: { 케이스: string[]; PR본문: string; 차이: string | null; 원고: string | null },
  비밀: string | null | undefined,
): string | null {
  const 모두 = [...글들.케이스, 글들.PR본문, 글들.차이 ?? '', 글들.원고 ?? ''];
  return 계정섞였나(모두, 비밀) ? '올릴 것에 테스트 계정 비밀번호가 들어 있다 — 올리지 않는다' : null;
}

/** 실패 사유가 화면·서버 기록으로 나가기 전에 거른다. 자식 stderr 나 도구 오류에 원문이 섞일 수 있다 */
export function 사유거르기(글: string, 비밀: string | null | undefined): string {
  return 계정섞였나([글], 비밀) ? '실패 사유에 테스트 계정 비밀번호가 섞여 있어 가렸다 — 에이전트 기록을 봐라' : 글;
}

/**
 * 역기획서 원고를 받을 수 있나. **그림 문법(`![`)은 거절한다** — pandoc 마크다운이 바깥 파일을 문서에 끌어오는 길이
 * 그림이고, 원격 주소면 받아 오기까지 한다. 서버의 pandoc(2.9)에는 `--sandbox` 가 없다(2026-09-26 실측)
 */
export function 원고거부사유(원고: string): string | null {
  return 원고.includes('![') ? '역기획서 원고에 그림이 있다 — 그림은 넣지 않는다(글·표·링크만)' : null;
}

/** 원고 → 워드. 셸을 거치지 않는 인자 배열이다 */
export function 변환인자(원고: string, 워드: string): string[] {
  return ['-f', 'markdown', '-t', 'docx', '-o', 워드, 원고];
}

/**
 * 바꾼 워드를 다시 **문서 구조(JSON)** 로 — 실제로 올릴 파일에서 비밀번호를 한 번 더 찾으려고.
 * 글자(`plain`)로 되읽으면 링크 주소와 문서 정보(제목 등)를 버린다 — 엔티티로 쪼갠 원문이 거기 숨는다 (2026-09-26 보안 검토)
 */
export function 되읽기인자(워드: string, 구조: string): string[] {
  return ['-f', 'docx', '-t', 'json', '-o', 구조, 워드];
}

/**
 * 값 안의 글을 전부 모은다 — 되읽은 문서 구조 · 푼 차이 목록. **푼 값에서 찾아야 한다** —
 * 날 글자는 JSON 이스케이프(`\"` · `\u…`)로 따옴표·역슬래시가 든 비밀번호를 가린다 (2026-09-26 검사)
 */
export function 글모두(값: unknown): string[] {
  if (typeof 값 === 'string') return [값];
  if (Array.isArray(값)) return 값.flatMap(글모두);
  if (typeof 값 === 'object' && 값 !== null) return Object.values(값).flatMap(글모두);
  return [];
}

/**
 * pandoc 을 돌릴 환경. **부모 칸을 전부 지운다**(값 `undefined` 는 spawn 이 안 넘긴다) — 맥(자식 uid 없음)에서
 * `친다` 는 준 환경을 부모 위에 얹어서, 그냥 두면 에이전트 토큰·GitHub 자격증명이 믿을 수 없는 원고를 여는 도구에 간다.
 * PATH 만 남긴다 — 맥의 pandoc 은 /opt/homebrew/bin 에 있다
 */
export function 변환환경(
  부모: Record<string, string | undefined>,
  자리: { HOME: string; TMPDIR: string },
): Record<string, string | undefined> {
  const 지움 = Object.fromEntries(Object.keys(부모).map((키) => [키, undefined]));
  return { ...지움, PATH: 부모.PATH ?? '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', ...자리 };
}

/** `outputs` 통로 주소 (§7). 이름은 사람이 안 준 것이지만 퍼센트 인코딩한다 — `&` 가 다른 질의 칸으로 새지 않게 */
export function 산출물주소(
  id: number,
  서비스: string,
  이름: string,
  역할: 'MARKED' | 'REVERSE_SPEC',
  원본?: number,
): string {
  const 질의 = [
    `service=${encodeURIComponent(서비스)}`,
    `name=${encodeURIComponent(이름)}`,
    `role=${역할}`,
    ...(원본 === undefined ? [] : [`source=${String(원본)}`]),
  ];
  return `/api/authoring/requests/${String(id)}/outputs?${질의.join('&')}`;
}
