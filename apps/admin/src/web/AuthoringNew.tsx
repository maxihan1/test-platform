// PRD 파일과 피그마 주소를 한 세트로 넣어 작성을 요청하는 폼 (도메인/작성 §3.6 · §7 「자료」)
//
// **경로가 아니라 파일 자체를 올린다.** 맥은 다른 기계라 이 서버의 파일 경로를 못 읽는다.
// 앞 판은 같은 이유로 본문을 붙여 넣게 했는데 **기획서가 PDF·워드로 오고 피그마가 같이 와서** 접었다 —
// 글만 붙이면 표와 그림이 빠진다 (2026-09-23, CLAUDE.md §2.7 ②)
//
// 작성 시작은 세 걸음이다 — 만들기(DRAFT) → 파일마다 올리기 → 줄에 세우기.
// 다 올리기 전에 줄에 서면 맥이 집어 가서 빈 것을 보고 실패한다

import { useRef, useState } from 'react';

import { api, ApiError, type EnvRow, type 앱종류 } from './api.js';
import { ApiDocFields, useApiDocs } from './AuthoringNewApi.js';
import { 거절사유, 받는종류, 운영자작성오류, 자료상한, 작성오류, 피그마거절말 } from './authoringNewText.js';
import { 크기글 } from './GuideSection.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { message, 기다림글자 } from './ui.js';

export { 가이드받는종류, 거절사유, 받는종류 } from './authoringNewText.js';

const 같은파일 = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

export function AuthoringNew({
  service,
  envs = [],
  운영자 = false,
  피그마토큰 = true,
  serviceId,
  앱종류,
  on넣었다,
}: {
  service: string;
  /** 이 애플리케이션의 번호. 있으면 API 종류인지 물어 API 문서 칸으로 바꾼다. 없으면 화면 폼이다 */
  serviceId?: number;
  /** 띠의 서비스가 가진 대상 서버. 계정 여부는 모른다 — `/auth/me` 에는 안 온다 (도메인/인증 §7) */
  envs?: EnvRow[];
  /** 설정 메뉴를 볼 수 있는 사람(admin). 아니면 「운영자에게 요청하세요」로 안내한다 */
  운영자?: boolean;
  /** 서비스에 피그마 토큰이 있나. 없는데 주소를 적으면 알리고 보내기를 막는다 — 보내도 서버가 거절한다. 모르면(옛 응답) 막지 않는다 (도메인/인증 §7) */
  피그마토큰?: boolean;
  /** Android 앱은 대조가 없고 「앱 화면 읽기」 안내가 선다 (도메인/러너 §5.2 종류 표) */
  앱종류?: 앱종류;
  /** 줄에 세운 요청 번호. 목록이 시작 모달을 연다 */
  on넣었다: (id: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [파일들, set파일들] = useState<File[]>([]);
  const [피그마, set피그마] = useState('');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 고르개 = useRef<HTMLInputElement>(null);
  // 역방향 (도메인/작성 §3.6 「★ 역방향」). 대상 서버는 고르지 않으면 첫 줄이다
  const [대조켜짐, set대조] = useState(false);
  const [고른서버, set고른서버] = useState<string | null>(null);
  const [시작주소, set시작주소] = useState('');
  // 고른 값이 지금 서비스의 목록에 있을 때만 쓴다 — 띠에서 서비스를 바꿔도 이 폼은 그대로 남아
  // 옛 서비스에서 고른 서버를 들고 있다. 안 보면 화면에 보이는 서버와 다른 것을 보낸다 (2026-09-26 검사)
  const 문서 = useApiDocs(serviceId);
  const api모드 = 문서.버전들 !== null;
  const [고른판, set고른판] = useState<number | null>(null);
  // API 애플리케이션은 화면이 없다 — 대조도 피그마도 없다 (도메인/작성 §7).
  // 「실서비스 서버」 표시는 /auth/me 에 안 와서 거를 수 없다 — 대신 기본값을 기준 서버(보통 stg)로 둔다. 실서비스를 고르면 서버가 BAD_ENV 로 막는다
  const 후보 = envs;
  const 기본서버 = api모드 && 문서.기준서버 !== null && envs.some((it) => it.env === 문서.기준서버) ? 문서.기준서버 : (후보[0]?.env ?? null);
  const 판 = 문서.버전들?.some((v) => v.version === 고른판) === true ? 고른판 : (문서.버전들?.[0]?.version ?? null);
  const 줄 = 종류(앱종류);
  // 크롤러는 웹만 읽는다 — 앱이 compare 를 보내면 서버가 400 BAD_ENV 로 막는다 (도메인/작성 §7 AUTHOR)
  const 대조칸 = !api모드 && 줄.대조;
  const 대조 = 대조칸 && 대조켜짐;
  const 서버 = 후보.some((it) => it.env === 고른서버) ? 고른서버 : 기본서버;
  const 주소 = 시작주소.trim();

  const 주소들 = (api모드 ? '' : 피그마)
    .split('\n')
    .map((줄) => 줄.trim())
    .filter((줄) => 줄 !== '');
  const 거절 = new Map<string, string[]>();
  for (const f of 파일들) {
    const 이유 = 거절사유(f);
    if (이유 !== null) 거절.set(이유, [...(거절.get(이유) ?? []), f.name]);
  }
  // API 요청은 만들 때 서버가 API 문서 자료 한 행을 먼저 붙인다 — 그 한 칸도 상한에 센다 (도메인/작성 §7 「자료」)
  const 너무많다 = 파일들.length + 주소들.length + (api모드 ? 1 : 0) > 자료상한;
  // 화면만(대조 + 자료 0)은 기획서 없이 그 화면을 훑는다 — 시작 주소가 없어도 크롤러가 대상 서버 주소에서 시작한다 (§7 submit)
  const 빈것 = 파일들.length === 0 && 주소들.length === 0 && !대조;
  const 서버없음 = 대조 && 서버 === null;
  const 토큰없는주소 = !피그마토큰 && 주소들.length > 0; // 칸은 잠그지 않고 적었을 때만 알린다 — 늘 뜨던 빨간 글이 피그마 없는 게임에 오류로 읽혔다 (GAME-F2-17)
  const 못보낸다 =
    문서.대기 || 거절.size > 0 || 너무많다 || 토큰없는주소 || (api모드 ? 판 === null || 서버 === null : 빈것 || 서버없음);

  function 사유(err: unknown): string {
    if (err instanceof ApiError && err.status === 413) return t('파일 하나가 크기 상한을 넘었습니다');
    // 까닭이 세 꼴이 아니면(프록시가 본문을 지운 경우 등) 빈 주소를 단 파일 문장을 지어내지 않고 공통 번역으로 넘긴다
    if (err instanceof ApiError && err.code === 'FIGMA_DENIED' && /^(NO_TOKEN|TOKEN|FILE:.+)$/.test(err.message)) {
      return 피그마거절말(err.message, 운영자, t);
    }
    const 말 = err instanceof ApiError ? ((운영자 ? 운영자작성오류[err.code] : undefined) ?? 작성오류[err.code]) : undefined;
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
      ({ id } = await api.createAuthoringRequest(
        service,
        api모드 && 판 !== null && 서버 !== null
          ? { kind: 'AUTHOR', figma: [], apiDoc: 판, env: 서버 }
          : { kind: 'AUTHOR', figma: 주소들, ...역방향 },
      ));
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
      // 자료를 못 올린 요청은 치운다 — 남겨 두면 목록에 「자료 올리는 중」으로 영영 남는다 (점검 11.6).
      // 줄에 세우기(지금 === null)에서 난 실패는 치우지 않는다 — 응답만 끊기고 서버는 세웠을 수 있다(코드 검토).
      // 서버 막기(AUTHORING_OPEN)는 안 세웠다고 확실히 답한 것이라 치운다 (도메인/작성 §3.6 「서버 막기」).
      // 치우기도 실패하면 그 줄을 손으로 폐기하라고 덧붙인다 — 삼키면 왜 줄이 남았는지 모른다
      const 안섰다 = 지금 !== null || (err instanceof ApiError && err.code === 'AUTHORING_OPEN');
      const 치움 =
        !안섰다
          ? ''
          : await api.discardAuthoring(service, id).then(
              () => '',
              () => ` ${t('목록에 남은 그 줄은 폐기하세요')}`,
            );
      set오류(`${t('이 요청은 대기열에 들어가지 못했습니다. 새 요청으로 다시 넣으세요')} (${어디})${치움}`);
      set보내는중(false);
      return;
    }
    set파일들([]);
    set피그마('');
    set시작주소('');
    set보내는중(false);
    on넣었다(id);
  }

  return (
    <form
      className="authoring-new"
      onSubmit={(e) => {
        e.preventDefault();
        void 보낸다();
      }}
    >
      {문서.버전들 === null ? null : (
        <ApiDocFields
          버전들={문서.버전들}
          판={판}
          on판={set고른판}
          envs={후보}
          서버={서버}
          on서버={set고른서버}
          운영자={운영자}
          disabled={보내는중}
        />
      )}
      {문서.오류 === null ? null : <span className="error-text">{문서.오류}</span>}
      {/* 브라우저 파일 칸은 숨기고 단추로 연다 — 값을 늘 비우므로 그대로 두면 파일을 골라도 「선택된 파일 없음」이 보인다(가이드 화면과 같은 꼴) */}
      <div className="authoring-field">
        <span>{t('PRD')}</span>
        <div>
          <button type="button" className="btn ghost small" disabled={보내는중} onClick={() => 고르개.current?.click()}>
            {t('파일 첨부')}
          </button>
        </div>
        <input
          ref={고르개}
          type="file"
          hidden
          multiple
          accept={받는종류}
          aria-label={t('PRD')}
          onChange={(e) => {
            // 앞에 고른 것에 이어 붙인다. 목록을 읽은 뒤 값을 비워야 같은 파일을 다시 골라도 change 가 난다
            const 고른 = Array.from(e.target.files ?? []);
            e.target.value = '';
            set파일들((앞) => [...앞, ...고른.filter((f) => !앞.some((g) => 같은파일(f, g)))]);
          }}
        />
        {파일들.length === 0 ? null : (
          <ul className="guide-files">
            {파일들.map((f) => (
              <li key={`${f.name}|${String(f.size)}|${String(f.lastModified)}`} className="guide-file">
                <span className="guide-name">{f.name}</span>
                <span className="guide-meta">{크기글(f.size)}</span>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={보내는중}
                  aria-label={t('{이름} 제거', { 이름: f.name })}
                  onClick={() => set파일들((앞) => 앞.filter((g) => g !== f))}
                >
                  {t('제거')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {api모드 ? null : (
        <>
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
          {토큰없는주소 ? <span className="error-text">{피그마거절말('NO_TOKEN', 운영자, t)}</span> : null}
          {/* 디바이스 팜은 메뉴가 아니라 작성 · 실행이 지나가는 통로라 그 일을 하는 자리에서 보인다 (도메인/러너 §5.2 결정 4) */}
          {줄.화면읽기 === null ? null : (
            <div className="authoring-field authoring-compare">
              <strong>{t(줄.화면읽기.제목)}</strong>
              {줄.화면읽기.줄들.map((it) => (
                <small key={it}>{t(it)}</small>
              ))}
            </div>
          )}
          {!대조칸 ? null : (
            <div className="authoring-field authoring-compare">
              <label>
                <input type="checkbox" checked={대조} onChange={(e) => set대조(e.target.checked)} />
                {t('실제 화면과 대조')}
              </label>
              {대조 && envs.length === 0 ? (
                <span className="error-text">
                  {운영자
                    ? t('이 애플리케이션에는 대상 서버가 없습니다. 설정 > 애플리케이션에서 먼저 넣으세요')
                    : t('이 애플리케이션에는 대상 서버가 없습니다. 관리자에게 대상 서버를 넣어 달라고 요청하세요')}
                </span>
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
                  <small>{t('기획서가 있으면 기획서 화면을 먼저 작성하고, 반영되면 기획서에 없는 화면을 이어서 작성합니다. 기획서 없이 보내면 PRD 에 아직 없는 화면만 작성합니다')}</small>
                </>
              ) : null}
            </div>
          )}
        </>
      )}
      <button className="btn" type="submit" disabled={못보낸다 || 보내는중}>
        <기다림글자 중={보내는중} 평소={t('테스트 작성 시작')} 기다림={t('시작하는 중…')} />
      </button>
      {[...거절].map(([이유, 이름들]) => (
        <span key={이유} className="error-text">
          {t(이유)} — {이름들.join(' · ')}
        </span>
      ))}
      {너무많다 ? <span className="error-text">{t('한 요청에 넣을 수 있는 자료 개수를 넘었습니다')}</span> : null}
      {오류 === null ? null : <span className="error-text">{오류}</span>}
    </form>
  );
}
