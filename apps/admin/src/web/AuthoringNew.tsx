// 새 작성 마법사 — 가운데 창에서 가이드 → 작성 방법 → 자료 → 대상 서버 → 확인을 한 단계씩 넘기고 작성을 요청한다
// (도메인/작성 §3.6 · §7 「자료」 · 2026-11-11 사용자 시안 WizardB). 앞 판은 오른쪽 서랍 한 폼에 칸이 다 있어 무엇부터 채울지 몰랐다
//
// **경로가 아니라 파일 자체를 올린다.** 맥은 다른 기계라 이 서버의 파일 경로를 못 읽는다.
// 작성 시작은 세 걸음이다 — 만들기(DRAFT) → 파일마다 올리기 → 줄에 세우기. 다 올리기 전에 줄에 서면 맥이 집어 가서 빈 것을 보고 실패한다

import { useState } from 'react';

import { api, ApiError, type EnvRow, type 앱종류 } from './api.js';
import { ApiDocFields, useApiDocs } from './AuthoringNewApi.js';
import { 단계띠, 단계머리, 방법칸, 방법표, 서버칸, 파일칸, 확인칸, type 단계, type 방법 } from './AuthoringNewSteps.js';
import { 거절사유, 자료상한, 작성오류말, 피그마거절말 } from './authoringNewText.js';
import { GuideBody, useGuideEdit } from './GuideBody.js';
import { 구획들 } from './GuideSection.js';
import { use말, use언어 } from './i18n.js';
import { 종류 } from './kind.js';
import { 떠나기상자 } from './leaveGuard.js';
import { Modal } from './Modal.js';
import { Failed, Loading, message, 기다림글자 } from './ui.js';

export { 가이드받는종류, 거절사유, 받는종류 } from './authoringNewText.js';

export function AuthoringNew({
  service,
  envs = [],
  운영자 = false,
  피그마토큰 = true,
  serviceId,
  앱종류,
  on넣었다,
  onClose = () => undefined,
}: {
  service: string;
  /** 이 애플리케이션의 번호. 있으면 API 종류인지 물어 API 문서 칸으로 바꾼다. 없으면 화면 폼이다 */
  serviceId?: number;
  /** 띠의 서비스가 가진 대상 서버. 계정 여부는 모른다 — `/auth/me` 에는 안 온다 (도메인/인증 §7) */
  envs?: EnvRow[];
  /** 설정 메뉴를 볼 수 있는 사람(admin). 아니면 「관리자에게 요청하세요」로 안내한다 */
  운영자?: boolean;
  /** 서비스에 피그마 토큰이 있나. 없는데 주소를 적으면 알리고 보내기를 막는다 — 보내도 서버가 거절한다. 모르면(옛 응답) 막지 않는다 (도메인/인증 §7) */
  피그마토큰?: boolean;
  /** Android 앱 · 게임은 대조가 화면 읽기로 바뀌고 시작 주소가 없다 (도메인/러너 §5.2 종류 표) */
  앱종류?: 앱종류;
  /** 줄에 세운 요청 번호. 목록이 시작 모달을 연다 */
  on넣었다: (id: number) => void;
  onClose?: () => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 줄 = 종류(앱종류);
  // 가이드는 마법사가 열린 동안 한 벌을 든다 — 단계를 오가도 고치던 글이 남는다 (2026-11-11 사용자 「작성 전에 가이드 먼저」)
  const 가이드 = useGuideEdit(service);
  const [빈가이드, set빈가이드] = useState<boolean | null>(null);
  // 처음 읽었을 때 비었는지로 칸 모양을 정한다 — 파일을 첨부해 버전이 생겨도 쓰던 칸이 읽기로 바뀌지 않게
  if (빈가이드 === null && 가이드.now !== null) set빈가이드(가이드.now.version === 0);
  const [칸, set칸] = useState(0);
  const [고른방법, set고른방법] = useState<방법 | null>(null);
  const [파일들, set파일들] = useState<File[]>([]);
  const [피그마, set피그마] = useState('');
  const [고른서버, set고른서버] = useState<string | null>(null);
  const [시작주소, set시작주소] = useState('');
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 문서 = useApiDocs(serviceId);
  const api모드 = 문서.버전들 !== null;
  const [고른판, set고른판] = useState<number | null>(null);

  // API 애플리케이션은 화면이 없다 — 대조도 피그마도 없다 (도메인/작성 §7).
  // 「실서비스 서버」 표시는 /auth/me 에 안 와서 거를 수 없다 — 대신 기본값을 기준 서버(보통 stg)로 둔다. 실서비스를 고르면 서버가 BAD_ENV 로 막는다
  const 기본서버 = api모드 && 문서.기준서버 !== null && envs.some((it) => it.env === 문서.기준서버) ? 문서.기준서버 : (envs[0]?.env ?? null);
  // 고른 값이 지금 서비스의 목록에 있을 때만 쓴다 — 띠에서 서비스를 바꿔도 옛 서비스에서 고른 서버를 보내지 않게 (2026-09-26 검사)
  const 서버 = envs.some((it) => it.env === 고른서버) ? 고른서버 : 기본서버;
  const 판 = 문서.버전들?.some((v) => v.version === 고른판) === true ? 고른판 : (문서.버전들?.[0]?.version ?? null);
  // 웹은 크롤러, Android 앱은 appium-cli, 게임은 창 훑기가 훑는다 (도메인/작성 §7 AUTHOR · §3.6 「앱 · 게임 역방향」)
  const 대조칸 = !api모드 && 줄.대조 !== null;
  const 방법값: 방법 = 대조칸 ? (고른방법 ?? 'prd') : 'prd';
  const 대조 = 대조칸 && 방법값 !== 'prd';
  // 「화면을 훑어서」는 자료 없이 간다 — 앞 단계에서 넣어 둔 파일이 있어도 싣지 않는다
  const 보낼파일 = 방법값 === 'screen' ? [] : 파일들;
  const 주소들 = (api모드 || 방법값 === 'screen' ? '' : 피그마)
    .split('\n')
    .map((it) => it.trim())
    .filter((it) => it !== '');
  const 주소 = 시작주소.trim();

  const 단계들: 단계[] = [
    'guide',
    ...(대조칸 ? (['method'] as const) : []),
    ...(방법값 === 'screen' ? [] : (['material'] as const)),
    ...(대조 ? (['server'] as const) : []),
    'confirm',
  ];
  const 지금 = Math.min(칸, 단계들.length - 1);
  const 단계 = 단계들[지금]!;

  const 거절 = new Map<string, string[]>();
  for (const f of 보낼파일) {
    const 이유 = 거절사유(f);
    if (이유 !== null) 거절.set(이유, [...(거절.get(이유) ?? []), f.name]);
  }
  // API 요청은 만들 때 서버가 API 문서 자료 한 행을 먼저 붙인다 — 그 한 칸도 상한에 센다 (도메인/작성 §7 「자료」)
  const 너무많다 = 보낼파일.length + 주소들.length + (api모드 ? 1 : 0) > 자료상한;
  const 토큰없는주소 = !피그마토큰 && 주소들.length > 0; // 칸은 잠그지 않고 적었을 때만 알린다 — 늘 뜨던 빨간 글이 피그마 없는 게임에 오류로 읽혔다 (GAME-F2-17)

  /** 그 단계에서 「다음」을 막는 까닭. 서버가 거절할 것을 그 칸이 있는 단계에서 먼저 짚는다 */
  function 막는이유(s: 단계): string | null {
    switch (s) {
      case 'guide':
        // API 애플리케이션인지 알아야 다음 단계가 정해진다 — 모른 채 넘기면 단계 띠가 바뀌며 엉뚱한 단계에 선다
        if (문서.대기) return t('불러오는 중입니다');
        return 가이드.바뀜 && 빈가이드 === false ? t('수정한 가이드 구획을 저장하거나 취소하세요') : null;
      case 'method':
        return 고른방법 === null ? t('작성 방법을 선택하세요') : null;
      case 'material':
        if (문서.대기) return t('불러오는 중입니다');
        if (거절.size > 0 || 너무많다 || 토큰없는주소) return t('넣은 자료를 확인하세요');
        if (api모드) return 판 === null || 서버 === null ? t('API 문서 버전과 대상 서버를 선택하세요') : null;
        return 보낼파일.length === 0 && 주소들.length === 0 ? t('기획서 파일이나 피그마 주소를 하나 이상 넣으세요') : null;
      case 'server':
        return 서버 === null ? t('대상 서버를 선택하세요') : null;
      case 'confirm':
        return null;
    }
  }
  const 막힘 = 막는이유(단계);
  const 못보낸다 = 단계들.some((s) => 막는이유(s) !== null);

  function 사유(err: unknown): string {
    if (err instanceof ApiError && err.status === 413) return t('파일 하나가 크기 상한을 넘었습니다');
    // 까닭이 세 꼴이 아니면(프록시가 본문을 지운 경우 등) 빈 주소를 단 파일 문장을 지어내지 않고 공통 번역으로 넘긴다
    if (err instanceof ApiError && err.code === 'FIGMA_DENIED' && /^(NO_TOKEN|TOKEN|FILE:.+)$/.test(err.message)) {
      return 피그마거절말(err.message, 운영자, t);
    }
    const 말 = err instanceof ApiError ? 작성오류말(err.code, 운영자, 줄.대조 === 'app') : undefined;
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
        대조 && 서버 !== null ? { compare: true as const, env: 서버, ...(주소 === '' || 줄.대조 !== 'web' ? {} : { startUrl: 주소 }) } : {};
      ({ id } = await api.createAuthoringRequest(
        service,
        api모드 && 판 !== null && 서버 !== null ? { kind: 'AUTHOR', figma: [], apiDoc: 판, env: 서버 } : { kind: 'AUTHOR', figma: 주소들, ...역방향 },
      ));
    } catch (err) {
      set오류(사유(err));
      set보내는중(false);
      return;
    }
    // 여기서부터 실패하면 DRAFT 가 남는다. 이어 올리기는 안 만들었다 — 새로 넣으라고만 한다 (§7 「자료」)
    let 올리는: File | null = null;
    try {
      for (const 파일 of 보낼파일) {
        올리는 = 파일;
        await api.uploadAuthoringAsset(service, id, 파일);
      }
      올리는 = null;
      await api.submitAuthoringRequest(service, id);
    } catch (err) {
      const 어디 = 올리는 === null ? 사유(err) : `${올리는.name} — ${사유(err)}`;
      // 자료를 못 올린 요청은 삭제한다 — 남겨 두면 목록에 「자료 업로드 중」으로 영영 남는다 (점검 11.6).
      // 줄에 세우기(올리는 === null)에서 난 실패는 삭제하지 않는다 — 응답만 끊기고 서버는 세웠을 수 있다(코드 검토).
      // 서버 막기(AUTHORING_OPEN)는 안 세웠다고 확실히 답한 것이라 삭제한다 (도메인/작성 §3.6 「서버 막기」).
      // 삭제도 실패하면 그 줄을 손으로 삭제하라고 덧붙인다 — 삼키면 왜 줄이 남았는지 모른다
      const 안섰다 = 올리는 !== null || (err instanceof ApiError && err.code === 'AUTHORING_OPEN');
      const 남은줄 = !안섰다
        ? ''
        : await api.discardAuthoring(service, id).then(
            () => '',
            () => ` ${t('목록에 남은 그 줄은 삭제하세요')}`,
          );
      set오류(`${t('이 요청은 대기열에 들어가지 못했습니다. 새 요청으로 다시 넣으세요')} (${어디})${남은줄}`);
      set보내는중(false);
      return;
    }
    set파일들([]);
    set피그마('');
    set시작주소('');
    set보내는중(false);
    on넣었다(id);
  }

  const 앞으로 = () => {
    set오류(null);
    set칸(지금 + 1);
  };
  const 닫기 = () => {
    if (!보내는중) onClose();
  };
  const 한번에 = 빈가이드 === true;

  // 확인 단계의 요약 줄 — 칸 이름과 값
  const 방법이름 = t(방법표.find((it) => it.값 === 방법값)!.제목);
  const 요약: [string, string][] = [
    [
      t('가이드'),
      가이드.now === null || 가이드.now.version === 0 ? t('가이드 없이 작성합니다') : t('{가이드} 버전 {버전} 을 같이 읽습니다', { 가이드: t(줄.가이드), 버전: 가이드.now.version }),
    ],
    ...(대조칸 ? ([[t('작성 방법'), 방법이름]] as [string, string][]) : []),
    ...(api모드 && 판 !== null ? ([[t('API 문서'), t('버전 {버전}', { 버전: 판 })]] as [string, string][]) : []),
    ...(방법값 === 'screen'
      ? []
      : ([[t('자료'), [...보낼파일.map((f) => f.name), ...(주소들.length === 0 ? [] : [t('피그마 {수}건', { 수: 주소들.length })])].join(' · ') || '—']] as [string, string][])),
    ...((대조 || api모드) && 서버 !== null ? ([[t('대상 서버'), 대조 && 줄.대조 === 'web' && 주소 !== '' ? `${서버} · ${주소}` : 서버]] as [string, string][]) : []),
  ];
  const 할일 = api모드
    ? t('API 문서의 엔드포인트마다 케이스를 작성해 검토용 PR 로 등록합니다')
    : 방법값 === 'both'
      ? t('기획서 화면을 먼저 작성하고, 반영되면 기획서에 없는 화면을 이어서 작성합니다')
      : 방법값 === 'screen'
        ? t('PRD 에 아직 없는 화면만 작성합니다')
        : t('요구사항마다 케이스를 작성해 검토용 PR 로 등록합니다');

  const 버튼 =
    단계 === 'guide' && 한번에 ? (
      <>
        <button className="btn ghost" type="button" disabled={가이드.busy} onClick={앞으로}>
          {t('나중에 쓰기')}
        </button>
        <button
          className="btn"
          type="button"
          disabled={!가이드.바뀜 || 가이드.busy}
          onClick={() => void 가이드.저장(구획들).then((ok) => ok && 앞으로())}
        >
          {t('저장하고 다음')}
        </button>
      </>
    ) : (
      <>
        {막힘 === null || 단계 === 'confirm' ? null : <span className="wiz-new-why">{막힘}</span>}
        <button className="btn ghost" type="button" disabled={보내는중} onClick={지금 === 0 ? 닫기 : () => set칸(지금 - 1)}>
          {지금 === 0 ? t('취소') : t('이전')}
        </button>
        {단계 === 'confirm' ? (
          <button className="btn" type="button" disabled={못보낸다 || 보내는중} onClick={() => void 보낸다()}>
            <기다림글자 중={보내는중} 평소={t('테스트 작성 시작')} 기다림={t('시작하는 중')} />
          </button>
        ) : (
          <button className="btn" type="button" disabled={막힘 !== null} onClick={앞으로}>
            {t('다음')}
          </button>
        )}
      </>
    );

  return (
    <Modal 제목={t('새 작성')} onClose={닫기} 바깥눌러닫기={false} 버튼={버튼}>
      <div className="wiz-new">
        <단계띠 단계들={단계들} 지금={지금} />
        {단계 === 'guide' ? (
          <>
            <단계머리
              제목={t(한번에 ? '애플리케이션을 알려 주세요' : '이 가이드를 같이 읽습니다')}
              설명={t('AI 가 케이스를 작성할 때 참고합니다. 기대 결과는 요구사항에서만 가져옵니다')}
            />
            {가이드.오류 !== null ? <Failed error={가이드.오류} /> : 가이드.now === null ? <Loading /> : <GuideBody service={service} 가이드={가이드} 쓰나 예={줄.가이드예} 한번에={한번에} />}
          </>
        ) : 단계 === 'method' ? (
          <방법칸 고른={고른방법} on고름={set고른방법} 화면읽기={줄.화면읽기} />
        ) : 단계 === 'material' ? (
          <>
            <단계머리 제목={t(api모드 ? '무엇을 보고 작성할까요?' : '기획서와 디자인을 넣어 주세요')} 설명={t('여러 파일을 한 세트로 넣을 수 있습니다')} />
            {문서.버전들 === null ? null : (
              <ApiDocFields 버전들={문서.버전들} 판={판} on판={set고른판} envs={envs} 서버={서버} on서버={set고른서버} 운영자={운영자} disabled={보내는중} />
            )}
            {문서.오류 === null ? null : <span className="error-text">{문서.오류}</span>}
            <파일칸 파일들={파일들} set파일들={set파일들} disabled={보내는중} />
            {api모드 ? null : (
              <label className="authoring-field">
                <span>{t('피그마 주소')}</span>
                <textarea className="mono" placeholder={t('한 줄에 하나씩')} value={피그마} rows={3} onChange={(e) => set피그마(e.target.value)} />
              </label>
            )}
            {토큰없는주소 ? <span className="error-text">{피그마거절말('NO_TOKEN', 운영자, t)}</span> : null}
            {[...거절].map(([이유, 이름들]) => (
              <span key={이유} className="error-text">
                {t(이유)} — {이름들.join(' · ')}
              </span>
            ))}
            {너무많다 ? <span className="error-text">{t('한 요청에 넣을 수 있는 자료 개수를 넘었습니다')}</span> : null}
          </>
        ) : 단계 === 'server' ? (
          <서버칸 envs={envs} 서버={서버} on서버={set고른서버} 웹={줄.대조 === 'web'} 시작주소={시작주소} on시작주소={set시작주소} 운영자={운영자} />
        ) : (
          <확인칸 줄들={요약} 할일={할일} />
        )}
        {오류 === null ? null : <span className="error-text">{오류}</span>}
      </div>
      <떠나기상자 막나={파일들.length > 0 || 피그마.trim() !== '' || 시작주소.trim() !== '' || 가이드.바뀜} />
    </Modal>
  );
}
