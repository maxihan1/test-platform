// 케이스 품질을 숫자로 센다 — 작성을 나눠 맡긴 뒤 품질이 떨어졌는지 사람 손 없이 견주려고 (SPEC 도메인/작성 §3.6)

export interface 파일글 {
  경로: string;
  글: string;
}

export interface 품질 {
  케이스: number;
  /** 케이스 파일마다 `verify(` 수의 평균 */
  판정평균: number;
  /** `blocker: true` 판정이 하나라도 있는 케이스의 비율 — 준비 단계마다 화면이 맞는지 확인했나 */
  전제확인비율: number;
  /** 공용 부품(components) 밖에서 CSS · XPath 로 찾은 locator 수 — 역할 · 라벨보다 쉽게 깨진다 */
  밖CSS: number;
  /** 둘 이상의 케이스 파일에 같은 이름으로 만든 도우미 — 묶음마다 따로 만든 흔적(MKT 11208 은 가입 · 탈퇴 도우미가 55개 파일) */
  겹친도우미: string[];
}

const 케이스파일 = /\.spec\.ts$/;
const CSS찾기 = /locator\(\s*['"`](?:[.#[]|\/\/|xpath=|css=)/g;
const 도우미 = /^(?:export\s+)?(?:async\s+function\s+|function\s+|const\s+)([\p{L}_$][\p{L}\p{N}_$]*)\s*(?:\(|=\s*(?:async\s*)?\()/gmu;

export function 품질숫자(파일들: 파일글[]): 품질 {
  const 케이스들 = 파일들.filter((f) => 케이스파일.test(f.경로));
  const 판정수 = 케이스들.reduce((n, f) => n + (f.글.match(/\bverify\(/g)?.length ?? 0), 0);
  const 전제 = 케이스들.filter((f) => /blocker:\s*true/.test(f.글)).length;
  const 밖CSS = 파일들
    .filter((f) => !f.경로.split('/').includes('components'))
    .reduce((n, f) => n + (f.글.match(CSS찾기)?.length ?? 0), 0);

  const 이름파일수 = new Map<string, number>();
  for (const f of 케이스들) for (const 이름 of new Set([...f.글.matchAll(도우미)].map((m) => m[1]!))) 이름파일수.set(이름, (이름파일수.get(이름) ?? 0) + 1);
  const 겹친도우미 = [...이름파일수].filter(([, n]) => n >= 2).map(([이름]) => 이름).sort();

  const n = 케이스들.length;
  return { 케이스: n, 판정평균: n === 0 ? 0 : 판정수 / n, 전제확인비율: n === 0 ? 0 : 전제 / n, 밖CSS, 겹친도우미 };
}

/** PR 본문 「작성 요약」 머리에 싣는 한 줄. 도우미 이름은 앞 다섯까지 */
export function 품질줄(q: 품질): string {
  const 이름 = q.겹친도우미.length === 0 ? '' : `(${q.겹친도우미.slice(0, 5).join(' · ')}${q.겹친도우미.length > 5 ? ' …' : ''})`;
  return (
    `품질 숫자: 케이스 ${q.케이스} · 판정 평균 ${q.판정평균.toFixed(1)} · 전제 확인 ${Math.round(q.전제확인비율 * 100)}% · ` +
    `공용 부품 밖 CSS·XPath ${q.밖CSS} · 여러 파일에 따로 만든 도우미 ${q.겹친도우미.length}개${이름}`
  );
}
