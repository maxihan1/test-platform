// 작성 요청 한 건 상세. 어디까지 했고 무엇이 나왔는지 보고, 마음에 들면 머지를 건다
// (도메인/작성 §3.6 · §7 · 도메인/인증 §7 「등급으로 갈리는 자리」)

import { useEffect, useState } from 'react';

import { api, type AuthoringAsset, type AuthoringRow } from './api.js';
import { 보임라벨, 종류라벨, 줄보임, 차이목록, 차이종류라벨 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 할수있나, type 등급 } from './role.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

/**
 * 끝난 것은 더 안 바뀐다. 계속 물으면 탭 하나가 2초마다 서버를 두드린다.
 * 준비 중(DRAFT)도 스스로 안 바뀐다 — 줄에 세우는 것은 이 화면이 아니라 새 요청 폼이고,
 * 중간에 실패한 것은 버려진 채 남는다 (도메인/작성 §7 「자료」)
 */
function 끝났나(status: AuthoringRow['status']): boolean {
  return status === 'DONE' || status === 'FAILED' || status === 'DRAFT';
}

/** 파일은 내려받기, 피그마는 저장된(정규화한) 주소로 연다 */
function 자료고리({ 요청, 자료, 글 }: { 요청: number; 자료: AuthoringAsset; 글: string }) {
  if (자료.kind === 'FIGMA') {
    return (
      <a href={자료.figmaUrl ?? 자료.name} target="_blank" rel="noopener noreferrer">
        {글}
      </a>
    );
  }
  // 서버가 attachment 로 준다. download 는 같은 뜻을 브라우저에 한 번 더 말한다
  return (
    <a href={api.authoringAssetUrl(요청, 자료.id)} download>
      {글}
    </a>
  );
}

/** 산출물이 무엇인지. 표시 사본은 어느 입력의 사본인지까지 — 입력이 여럿이면 이름 없이는 못 가린다 */
function 산출물설명(a: AuthoringAsset, 자료들: AuthoringAsset[], t: (키: string) => string): string {
  if (a.role === 'REVERSE_SPEC') return t('역기획서');
  const 원본 = 자료들.find((x) => x.id === a.sourceAssetId);
  return `${t('표시 사본')} — ${원본?.name ?? t('기록 없음')}`;
}

export function AuthoringDetail({ service, id, role }: { service: string; id: number; role: 등급 }) {
  const t = use말();
  const 언어 = use언어();
  const [머지중, set머지중] = useState(false);
  const [머지오류, set머지오류] = useState<string | null>(null);

  const 것 = useAsync<AuthoringRow>(() => api.authoringRequest(service, id), [service, id]);
  const data = 것.data;
  const reload = 것.reload;
  const 도는중 = data !== null && !끝났나(data.status);

  // 맥이 뒤에서 이어 간다. 끝날 때까지만 다시 묻고 끝나면 멈춘다 (RunResult 와 같은 모양)
  useEffect(() => {
    if (!도는중) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중, reload]);

  if (것.error !== null) return <Failed error={것.error} />;
  if (data === null) return <Loading />;

  const 보 = 줄보임(data, Date.now());
  // 입력과 산출물을 가른다. role 이 없으면 입력이다 — 이 칸을 모르는 옛 응답도 그대로 그린다
  const 자료들 = data.assets ?? [];
  const 입력 = 자료들.filter((a) => (a.role ?? 'INPUT') === 'INPUT');
  const 산출물 = 자료들.filter((a) => (a.role ?? 'INPUT') !== 'INPUT');
  const 차이들 = 차이목록(data.result);

  // **화면이 버튼을 안 그리는 것은 편의이지 방어가 아니다** — 서버 gate.ts 가 다시 막는다.
  // PR 주소가 없으면 머지할 대상 자체가 없다
  const 머지할수있나 = 할수있나(role, '작성머지') && data.status === 'DONE' && data.prUrl !== null;

  async function 머지건다() {
    if (머지중) return;
    set머지중(true);
    set머지오류(null);
    try {
      // 사람이 여기서 정하고 맥이 집어 실행한다. 맥은 판단하지 않는다 (도메인/작성 §3.6)
      const 선것 = await api.createAuthoringMerge(service, id);
      // **방금 만든 줄로 보낸다** (2026-09-23 검토가 잡았다). 이 화면에 머물면
      // 보고 있던 행은 그대로 `끝남` 이라 **아무 일도 안 일어난 것처럼 보이고**,
      // 사람이 또 누른다 — 누를 때마다 머지 요청이 하나씩 더 선다
      window.location.hash = `#/authoring/${선것.id}`;
    } catch (err) {
      set머지오류(message(err, 언어));
    } finally {
      set머지중(false);
    }
  }

  return (
    <>
      {/* 상세의 제목은 **그 대상 자체**다 — 실행 결과가 `RUN 2113` 을 쓰는 것과 같은 모양.
          자리 이름(`테스트 작성`)을 또 쓰면 어느 요청을 보고 있는지가 안 보인다 */}
      <Head 제목={`#${String(data.id)}`} 부제={종류라벨(data.kind, 언어)} />

      <div className="screen">
        <dl className="detail">
          <dt>{t('상태')}</dt>
          <dd>
            {보임라벨(보, 언어)}
            {/* **알려 주기만 하고 길을 안 주면 안 된다.** 멈춘 행은 지금 되살릴 방법이 없다 —
                집기는 대기 중인 것만 집고, 끝내기는 집은 쪽만 부를 수 있다 (2026-09-23 검토) */}
            {보 === 'stalled' ? <small>{t('맥이 멈춘 것 같습니다. 새 요청으로 다시 넣으세요')}</small> : null}
            {/* 이어 올리기·지우기는 안 만들었다 — 새로 넣으라고만 한다 (도메인/작성 §7 「자료」) */}
            {보 === 'draft' ? <small>{t('이 요청은 줄에 서지 않았습니다. 새 요청으로 다시 넣으세요')}</small> : null}
          </dd>

          <dt>{t('작업 단계')}</dt>
          <dd>{data.stage ?? t('기록 없음')}</dd>

          <dt>{t('요청한 사람')}</dt>
          <dd>{data.requestedByName}</dd>

          <dt>{t('집어 간 계정')}</dt>
          <dd>{data.claimedBy ?? t('기록 없음')}</dd>

          <dt>{t('요청한 시각')}</dt>
          <dd>{when(data.createdAt, 언어)}</dd>

          {/* 역방향 (도메인/작성 §3.6 「★ 역방향」). 계정은 이 응답에 없다 — 집기 응답에만 있다 */}
          {data.compare === true ? (
            <>
              <dt>{t('실제 화면과 대조')}</dt>
              <dd>
                {data.env ?? t('기록 없음')} · {data.startUrl ?? t('기획서가 말하는 화면에서 시작')}
                {입력.length === 0 ? <small>{t('화면만 — 기획서 없이 이 화면을 훑습니다')}</small> : null}
              </dd>
            </>
          ) : null}
        </dl>

        {입력.length === 0 ? null : (
          <ol className="authoring-assets" aria-label={t('입력 자료')}>
            {입력.map((a) => (
              <li key={a.id}>
                <자료고리 요청={data.id} 자료={a} 글={a.name} />
              </li>
            ))}
          </ol>
        )}

        {산출물.length === 0 ? null : (
          <>
            <h3 className="authoring-sub-head">{t('산출물')}</h3>
            <ol className="authoring-assets" aria-label={t('산출물')}>
              {산출물.map((a) => (
                <li key={a.id}>
                  <자료고리 요청={data.id} 자료={a} 글={a.name} />
                  <small>{산출물설명(a, 자료들, t)}</small>
                </li>
              ))}
            </ol>
          </>
        )}

        {차이들 === null ? null : (
          // 좁은 화면에서 일곱 칸이 쪼개지지 않게 표만 옆으로 구른다 (DESIGN.md 「반응형」)
          <div className="authoring-diffs-wrap">
            <table className="dhist authoring-diffs" aria-label={t('기획서와 화면의 차이')}>
              <thead>
                <tr>
                  <th>{t('번호')}</th>
                  <th>{t('종류')}</th>
                  <th>{t('자리')}</th>
                  <th>{t('기획서')}</th>
                  <th>{t('화면')}</th>
                  <th>{t('케이스')}</th>
                  <th>{t('표시')}</th>
                </tr>
              </thead>
              <tbody>
                {차이들.map((d, i) => (
                  <tr key={`${d.no}-${String(i)}`}>
                    <td className="mono">{d.no}</td>
                    <td>{차이종류라벨(d.kind, 언어)}</td>
                    <td>{d.where ?? '—'}</td>
                    <td>{d.doc ?? '—'}</td>
                    <td>{d.screen ?? '—'}</td>
                    <td className="mono">{d.tcId ?? '—'}</td>
                    {/* 표시 실패는 판정이 아니다 — 판정 색 없이 이유만 적는다 (DESIGN.md 「판정 표기」 원칙 1) */}
                    <td>{d.marked ? t('표시함') : `${t('표시 못 함')} — ${d.markError ?? t('이유 기록 없음')}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 실패는 왜인지 말해야 한다. 「실패」만 뜨면 사람이 할 수 있는 일이 없다 */}
        {data.error === null ? null : <p className="error-text">{data.error}</p>}

        {data.prUrl === null ? null : (
          <p>
            <a href={data.prUrl} target="_blank" rel="noreferrer">
              {t('초안 PR 열기')}
            </a>
          </p>
        )}

        {머지할수있나 ? (
          <button className="btn" type="button" disabled={머지중} onClick={() => void 머지건다()}>
            {머지중 ? t('보내는 중') : t('머지')}
          </button>
        ) : null}

        {머지오류 === null ? null : <p className="error-text">{머지오류}</p>}
      </div>
    </>
  );
}
