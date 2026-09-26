// 기획서 파일과 피그마 주소를 한 세트로 넣어 작성을 요청하는 폼 (도메인/작성 §3.6 · §7 「자료」)
//
// **경로가 아니라 파일 자체를 올린다.** 맥은 다른 기계라 이 서버의 파일 경로를 못 읽는다.
// 앞 판은 같은 이유로 본문을 붙여 넣게 했는데 **기획서가 PDF·워드로 오고 피그마가 같이 와서** 접었다 —
// 글만 붙이면 표와 그림이 빠진다 (2026-09-23, CLAUDE.md §2.7 ②)
//
// 보내기는 세 걸음이다 — 만들기(DRAFT) → 파일마다 올리기 → 줄에 세우기.
// 다 올리기 전에 줄에 서면 맥이 집어 가서 빈 것을 보고 실패한다

import { useState } from 'react';

import { api, ApiError, type EnvRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

// 서버의 받는 종류와 같다. 값의 정본은 도메인/작성 §7 「자료」 표다
const 받는종류 = '.pdf,.docx,.doc,.md,.txt';
// 정본: 도메인/작성 §7 「자료」 — 서버 assets.ts 의 파일상한과 같은 값
const 파일상한 = 20 * 1024 * 1024;
// 정본: 도메인/작성 §7 「자료」 — 파일과 피그마를 합친 수. 서버 assetStore.ts 의 자료상한과 같은 값
const 자료상한 = 20;

/**
 * 서버가 거절할 파일을 보내기 전에 거른다. 거절 이유(말 키)를 돌려준다.
 * 보낸 뒤에 걸리면 이미 만든 요청이 「준비 중」으로 남고 되살릴 길이 없다 (§7 「자료」)
 */
function 거절사유(파일: File): string | null {
  const 점 = 파일.name.lastIndexOf('.');
  // 점이 맨 앞뿐인 이름(`.md`)은 서버의 extname 이 확장자 없음으로 읽는다. 여기서도 같게 본다
  if (점 <= 0 || !받는종류.split(',').includes(파일.name.slice(점).toLowerCase())) {
    return '받지 않는 파일입니다. PDF · 워드 · md · txt 만 받습니다';
  }
  // 서버 assets.ts 의 이름인가와 같은 규칙. `"` 를 \u0022 로 적은 것은 messages.test 의 글자 훑기가
  // 정규식 안의 따옴표를 문자열 시작으로 읽기 때문이다
  if (파일.name.includes('..') || /[\u0022/\\\u0000-\u001f\u007f]/.test(파일.name)) {
    return '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다';
  }
  if (파일.size === 0) return '빈 파일은 올릴 수 없습니다';
  if (파일.size > 파일상한) return '파일이 한 파일 상한보다 큽니다';
  return null;
}

// 이 폼에서만 만나는 서버 코드. 모르면 공통 번역(message)으로 넘긴다
const 작성오류: Record<string, string> = {
  BAD_FIGMA_URL: '피그마 주소 모양이 다릅니다. 피그마 디자인 파일의 링크를 넣으세요 (FigJam 은 받지 않습니다)',
  BAD_FILE_TYPE: '받지 않는 파일입니다. PDF · 워드 · md · txt 만 받습니다',
  BAD_NAME: '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다',
  TOO_MANY_ASSETS: '자료가 한 요청에 넣을 수 있는 개수를 넘었습니다',
  NO_ASSETS: '자료가 하나도 없습니다. 파일이나 피그마 주소를 넣으세요',
  NOT_REQUESTER: '요청한 사람만 자료를 올릴 수 있습니다',
  // 역방향 (도메인/작성 §7 AUTHOR 역방향). 화면은 계정 없는 줄을 미리 거르지 않는다 — 서버 거절을 풀어 준다
  BAD_ENV: '이 대상 서버에는 테스트 계정이 없습니다. 설정 > 서비스에서 테스트 계정을 넣으세요',
  BAD_START_URL: '시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다',
};

export function AuthoringNew({
  service,
  envs = [],
  on넣었다,
}: {
  service: string;
  /** 띠의 서비스가 가진 대상 서버. 계정 여부는 모른다 — `/auth/me` 에는 안 온다 (도메인/인증 §7) */
  envs?: EnvRow[];
  on넣었다: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [파일들, set파일들] = useState<File[]>([]);
  const [피그마, set피그마] = useState('');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 파일 칸은 비제어라 state 를 비워도 옛 파일을 보인다. 같은 파일을 다시 고르면 change 도 안 난다 — 새로 그린다
  const [칸번호, set칸번호] = useState(0);
  // 역방향 (도메인/작성 §3.6 「★ 역방향」). 대상 서버는 고르지 않으면 첫 줄이다
  const [대조, set대조] = useState(false);
  const [고른서버, set고른서버] = useState<string | null>(null);
  const [시작주소, set시작주소] = useState('');
  // 고른 값이 지금 서비스의 목록에 있을 때만 쓴다 — 띠에서 서비스를 바꿔도 이 폼은 그대로 남아
  // 옛 서비스에서 고른 서버를 들고 있다. 안 보면 화면에 보이는 서버와 다른 것을 보낸다 (2026-09-26 검사)
  const 서버 = envs.some((it) => it.env === 고른서버) ? 고른서버 : (envs[0]?.env ?? null);
  const 주소 = 시작주소.trim();

  const 주소들 = 피그마
    .split('\n')
    .map((줄) => 줄.trim())
    .filter((줄) => 줄 !== '');
  const 거절 = new Map<string, string[]>();
  for (const f of 파일들) {
    const 이유 = 거절사유(f);
    if (이유 !== null) 거절.set(이유, [...(거절.get(이유) ?? []), f.name]);
  }
  const 너무많다 = 파일들.length + 주소들.length > 자료상한;
  // 화면만(대조 + 시작 주소)은 기획서 없이 그 화면을 훑는다 — 자료 0 이어도 된다 (§7 submit)
  const 빈것 = 파일들.length === 0 && 주소들.length === 0 && !(대조 && 주소 !== '');
  const 서버없음 = 대조 && 서버 === null;
  const 못보낸다 = 빈것 || 거절.size > 0 || 너무많다 || 서버없음;

  function 사유(err: unknown): string {
    if (err instanceof ApiError && err.status === 413) return t('파일이 한 파일 상한보다 큽니다');
    const 말 = err instanceof ApiError ? 작성오류[err.code] : undefined;
    return 말 === undefined ? message(err, 언어) : t(말);
  }

  async function 보낸다() {
    if (못보낸다 || 보내는중) return;
    set보내는중(true);
    set오류(null);
    let id: number;
    try {
      // 대조가 아니면 역방향 칸을 아예 싣지 않는다 — 서버는 대조 아닌 요청의 env·startUrl 을 거절한다
      const 역방향 =
        대조 && 서버 !== null ? { compare: true as const, env: 서버, ...(주소 === '' ? {} : { startUrl: 주소 }) } : {};
      ({ id } = await api.createAuthoringRequest(service, { kind: 'AUTHOR', figma: 주소들, ...역방향 }));
    } catch (err) {
      set오류(사유(err));
      set보내는중(false);
      return;
    }
    // 여기서부터 실패하면 DRAFT 가 남는다. 이어 올리기는 안 만들었다 — 새로 넣으라고만 한다 (§7 「자료」)
    let 지금: File | null = null;
    try {
      for (const 파일 of 파일들) {
        지금 = 파일;
        await api.uploadAuthoringAsset(service, id, 파일);
      }
      지금 = null;
      await api.submitAuthoringRequest(service, id);
    } catch (err) {
      const 어디 = 지금 === null ? 사유(err) : `${지금.name} — ${사유(err)}`;
      set오류(`${t('이 요청은 줄에 서지 않았습니다. 새 요청으로 다시 넣으세요')} (${어디})`);
      set보내는중(false);
      return;
    }
    set파일들([]);
    set칸번호((n) => n + 1);
    set피그마('');
    set시작주소('');
    set보내는중(false);
    on넣었다();
  }

  return (
    <form
      className="toolbar authoring-new"
      onSubmit={(e) => {
        e.preventDefault();
        void 보낸다();
      }}
    >
      <label className="authoring-field">
        <span>{t('기획서 파일')}</span>
        <input
          key={칸번호}
          type="file"
          multiple
          accept={받는종류}
          onChange={(e) => set파일들(Array.from(e.target.files ?? []))}
        />
      </label>
      <label className="authoring-field">
        <span>{t('피그마 주소')}</span>
        <textarea
          className="mono"
          placeholder={t('한 줄에 하나씩')}
          value={피그마}
          rows={3}
          onChange={(e) => set피그마(e.target.value)}
        />
      </label>
      <div className="authoring-field authoring-compare">
        <label>
          <input type="checkbox" checked={대조} onChange={(e) => set대조(e.target.checked)} />
          {t('실제 화면과 대조')}
        </label>
        {대조 && envs.length === 0 ? (
          <span className="error-text">{t('이 서비스에는 대상 서버가 없습니다. 설정 > 서비스에서 먼저 넣으세요')}</span>
        ) : null}
        {대조 && envs.length > 0 ? (
          <>
            <div className="authoring-sub">
              <span aria-hidden="true">{t('대상 서버')}</span>
              {/* 감싸는 label 로 이름을 주면 선택지 글자까지 이름에 섞인다 */}
              <select aria-label={t('대상 서버')} value={서버 ?? ''} onChange={(e) => set고른서버(e.target.value)}>
                {envs.map((it) => (
                  <option key={it.env} value={it.env}>
                    {it.env}
                  </option>
                ))}
              </select>
            </div>
            <label className="authoring-sub">
              <span>{t('시작 주소')}</span>
              <input
                className="mono"
                // url 로 두면 브라우저가 제 말풍선으로 막는다 — 거절은 서버가 하고 사유는 이 폼이 적는다
                type="text"
                inputMode="url"
                value={시작주소}
                placeholder={envs.find((it) => it.env === 서버)?.baseUrl ?? ''}
                onChange={(e) => set시작주소(e.target.value)}
              />
            </label>
            <small>{t('비우면 기획서가 말하는 화면에서 시작합니다. 기획서 없이 시작 주소만 넣으면 그 화면을 훑어 역기획서를 만듭니다')}</small>
          </>
        ) : null}
      </div>
      <button className="btn" type="submit" disabled={못보낸다 || 보내는중}>
        {보내는중 ? t('보내는 중') : t('보내기')}
      </button>
      {[...거절].map(([이유, 이름들]) => (
        <span key={이유} className="error-text">
          {t(이유)} — {이름들.join(' · ')}
        </span>
      ))}
      {너무많다 ? <span className="error-text">{t('자료가 한 요청에 넣을 수 있는 개수를 넘었습니다')}</span> : null}
      {오류 === null ? null : <span className="error-text">{오류}</span>}
    </form>
  );
}
