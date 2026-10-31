// 설정 › 프로젝트 › BTS 연결 화면 (SPEC 도메인/BTS §8.15 · 시안 B 3판 2026-10-31). 연결 정보 → BTS 자동 설정 → 배포 스크립트 한 줄
// BTS 쪽(웹훅 · 규칙 둘 · 보드 칸)은 누른 사람의 통합계정 토큰으로 서버가 만든다 — 사람이 값을 옮겨 적지 않는다(2026-10-31 사용자 「자동으로 설정하면 되잖아」)

import { useEffect, useState } from 'react';

import { api, ApiError, type SettingsProject, type SettingsServiceRow } from './api.js';
import { btsApi, type BTS고를목록, type BTS설정결과, type BTS연결, type 상태단계, type 해결단계 } from './btsApi.js';
import { BTS이름 } from './btsName.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { 배포한줄, 상태단계들, 상태매핑구획, 자동설정결과, 코드저장소구획, 해결단계들, type 저장소들 } from './SettingsBtsParts.js';
import { 오류문장 } from './SettingsService.js';
import { 구획 } from './SettingsServiceParts.js';
import { Failed, Loading, useAsync } from './ui.js';

// 이 화면에서만 나는 코드 — 서버 bts/routes.ts. 나머지는 설정 화면 공통 문장으로 간다
const 연결오류: Record<string, string> = {
  BTS_UNREACHABLE: '{bts} 에 접속하지 못했습니다. 주소 · 프로젝트 키 · 「QA Hub AI」 계정 토큰을 확인해 주세요',
  BOT_KEY_REQUIRED: '주소를 바꾸면 「QA Hub AI」 계정 토큰을 다시 넣어야 합니다',
  SECRETS_REQUIRED: '처음 연결할 때는 「QA Hub AI」 계정 토큰을 넣어야 합니다',
  MAP_INCOMPLETE: '비어 있는 단계가 있습니다. 모든 단계에 {bts} 상태를 골라 주세요',
  NO_PERSONAL_TOKEN: '내 계정에 통합계정 토큰이 없습니다. 왼쪽 아래 내 메뉴 › 통합계정 토큰에 넣은 뒤 다시 눌러 주세요',
  PUBLIC_URL_REQUIRED: '이 서버의 공개 주소(PLATFORM_PUBLIC_URL)가 없어 {bts} 가 QA Hub 를 부를 수 없습니다',
};

export function SettingsBts({ row, services, onDone }: { row: SettingsProject; services: SettingsServiceRow[]; onDone: () => void }) {
  const 연결 = useAsync(() => btsApi.get(row.id), [row.id]);
  if (연결.data === null) return 연결.error !== null ? <Failed error={연결.error} /> : <Loading />;
  // 프로젝트가 바뀔 때만 칸을 새로 그린다 — 저장 뒤 다시 읽을 때 그리면 방금 받은 자동 설정 결과 · 토큰 원문이 사라진다(처음 이을 때도 그렇다)
  return <연결화면 key={row.id} row={row} 앱들={services.filter((it) => it.projectId === row.id)} 지금={연결.data} 다시={연결.reload} onDone={onDone} />;
}

function 연결화면({ row, 앱들, 지금, 다시, onDone }: { row: SettingsProject; 앱들: SettingsServiceRow[]; 지금: BTS연결; 다시: () => Promise<boolean>; onDone: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [baseUrl, setBaseUrl] = useState(지금.baseUrl ?? '');
  const [btsProject, setBtsProject] = useState(지금.btsProject ?? '');
  // 빈 칸이면 저장한 토큰을 그대로 쓴다 — 원문은 화면에 안 내려온다
  const [botKey, setBotKey] = useState('');
  const [상태, set상태] = useState(지금.statusMap);
  const [해결, set해결] = useState(지금.resolutionMap);
  const [저장소, set저장소] = useState<저장소들>(() => Object.fromEntries(앱들.map((앱) => [앱.id, 앱.codeRepos ?? []])));
  const [목록, set목록] = useState<BTS고를목록 | null>(null);
  const [목록오류, set목록오류] = useState<string | null>(null);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [결과, set결과] = useState<BTS설정결과[] | null>(null);
  const [배포원문, set배포원문] = useState<string | null>(null);
  const [끊기묻기, set끊기묻기] = useState(false);

  const 문장 = (e: unknown) => {
    const 말 = e instanceof ApiError ? 연결오류[e.code] : undefined;
    return 말 === undefined ? 오류문장(e, 언어) : t(말, { bts: BTS이름 });
  };

  async function 불러온다() {
    set목록오류(null);
    try {
      set목록(await btsApi.choices(row.id, baseUrl.trim(), botKey.trim() === '' ? undefined : botKey.trim()));
    } catch (e) {
      set목록(null);
      set목록오류(문장(e));
    }
  }

  // 이미 이은 프로젝트는 열 때 바로 불러온다 — 저장한 토큰으로 부른다. 처음 한 번만이다 — 칸을 고칠 때마다 BTS 를 부르지 않는다
  useEffect(() => {
    if (지금.linked) void 불러온다();
  }, []);

  const 빈단계 = 상태단계들.some(([단계]) => (상태[단계] ?? '').trim() === '') || 해결단계들.some(([단계]) => (해결[단계] ?? '').trim() === '');

  async function 저장하고설정() {
    if (빈단계) {
      set오류(t(연결오류.MAP_INCOMPLETE!, { bts: BTS이름 }));
      return;
    }
    set바쁨(true);
    set오류(null);
    set결과(null);
    try {
      await btsApi.save(row.id, {
        baseUrl: baseUrl.trim(),
        btsProject: btsProject.trim(),
        ...(botKey.trim() === '' ? {} : { botKey: botKey.trim() }),
        statusMap: 상태 as Record<상태단계, string>,
        resolutionMap: 해결 as Record<해결단계, string>,
      });
      // 고친 애플리케이션만 보낸다 — 빈 줄은 빼고 보낸다(서버는 이름 · 주소가 빈 줄을 거절한다)
      for (const 앱 of 앱들) {
        const 줄들 = (저장소[앱.id] ?? []).filter((it) => it.name.trim() !== '' || it.url.trim() !== '');
        if (JSON.stringify(줄들) !== JSON.stringify(앱.codeRepos ?? [])) await api.updateService(앱.id, { codeRepos: 줄들 });
      }
      setBotKey('');
      onDone();
      // 자동 설정이 막혀도 연결은 저장됐다 — 먼저 다시 읽어 「연결됨」 · 배포 구획이 서게 한다. 칸은 프로젝트 번호로만 다시 그려 지금 값이 남는다
      await 다시();
      set결과((await btsApi.setup(row.id)).items);
      await 다시();
    } catch (e) {
      set오류(문장(e));
    } finally {
      set바쁨(false);
    }
  }

  async function 배포토큰() {
    set오류(null);
    try {
      set배포원문((await btsApi.deployKey(row.id)).key);
    } catch (e) {
      set오류(문장(e));
    }
  }

  async function 끊기() {
    set끊기묻기(false);
    set바쁨(true);
    try {
      await btsApi.remove(row.id);
      await 다시();
    } catch (e) {
      set오류(문장(e));
      set바쁨(false);
    }
  }

  const 차례 = [
    { 이름: t('연결 정보 입력'), 됨: 지금.linked },
    { 이름: t('{bts} 자동 설정', { bts: BTS이름 }), 됨: 결과 !== null ? 결과.every((r) => r.ok) : 지금.ruleToken !== null },
    { 이름: t('배포 스크립트 한 줄'), 됨: 지금.deployKey !== null || 배포원문 !== null },
  ];

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">
        {t('{프로젝트} › {bts} 연결', { 프로젝트: row.name, bts: BTS이름 })}
        {지금.linked ? <span className="verdict v-pass">{t('연결됨 · {키}', { 키: 지금.btsProject ?? '' })}</span> : null}
      </h2>
      <ol className="bts-steps">
        {차례.map((it, i) => (
          <li key={i} className={it.됨 ? 'done' : ''}>
            <b aria-hidden="true">{it.됨 ? '✓' : i + 1}</b>
            {it.이름}
          </li>
        ))}
      </ol>

      <구획 제목={t('1 · 연결 정보')} 쓰임={t('저장하기 전에 {bts} 에 한 번 접속해 프로젝트 키가 맞는지 확인합니다', { bts: BTS이름 })}>
        <div className="field">
          <label htmlFor="bts-url">{t('{bts} 주소', { bts: BTS이름 })}</label>
          <input id="bts-url" type="url" value={baseUrl} placeholder="https://bts.example.com" onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bts-key">{t('{bts} 프로젝트 키', { bts: BTS이름 })}</label>
          <input id="bts-key" type="text" value={btsProject} maxLength={50} placeholder="DM" onChange={(e) => setBtsProject(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="bts-bot">{t('「QA Hub AI」 계정 토큰')}</label>
          <input id="bts-bot" type="password" autoComplete="off" value={botKey} placeholder={지금.botKeyTail === null ? 'pat_…' : t('넣음 (…{끝}) — 바꿀 때만 넣습니다', { 끝: 지금.botKeyTail })}
            onChange={(e) => setBotKey(e.target.value)} />
        </div>
        <p className="hint">{t('QA Hub 가 실패한 테스트를 {bts} 이슈로 올릴 때 쓰는 통합계정입니다. 사람 계정과 따로 두어야 {bts} 에서 누가 올렸는지 구분됩니다', { bts: BTS이름 })}</p>
      </구획>

      <상태매핑구획
        상태={상태}
        해결={해결}
        목록={목록}
        불러오는중={바쁨}
        목록오류={목록오류}
        불러온다={() => void 불러온다()}
        상태바꿈={(단계, 값) => set상태((전) => ({ ...전, [단계]: 값 }))}
        해결바꿈={(단계, 값) => set해결((전) => ({ ...전, [단계]: 값 }))}
      />
      <코드저장소구획 앱들={앱들} 저장소={저장소} 바꾼다={(앱, 줄) => set저장소((전) => ({ ...전, [앱]: 줄 }))} />

      <구획 제목={t('2 · {bts} 자동 설정', { bts: BTS이름 })} 쓰임={t('내 통합계정 토큰으로 {bts} 에 아래 넷을 만듭니다. 이미 있으면 새로 만들지 않고 고칩니다', { bts: BTS이름 })}>
        <자동설정결과 결과={결과} />
      </구획>
      {오류 === null ? null : (
        <div className="err" role="alert">
          {오류}
        </div>
      )}
      <div className="set-foot">
        {지금.linked ? (
          <button type="button" className="btn ghost danger" disabled={바쁨} onClick={() => set끊기묻기(true)}>
            {t('연결 해제')}
          </button>
        ) : null}
        <button type="button" className="btn" disabled={바쁨 || baseUrl.trim() === '' || btsProject.trim() === ''} onClick={() => void 저장하고설정()}>
          {t('저장하고 {bts} 자동 설정', { bts: BTS이름 })}
        </button>
      </div>

      {지금.linked ? (
        <구획 제목={t('3 · 배포 스크립트 한 줄')} 쓰임={t('deploy.sh 는 회사 배포 서버에 있어 QA Hub 가 고칠 수 없습니다. 아래 한 줄을 deploy.sh 마지막에 넣어 주세요')}>
          <div className="bts-key">
            <span>{t('배포 알림 토큰')}</span>
            <span className="set-sub">{배포원문 !== null ? t('방금 발급했습니다 · 원문은 지금만 보입니다') : 지금.deployKey === null ? t('발급 전 · 이 프로젝트 전용') : `••••${지금.deployKey.tail}`}</span>
            <button type="button" className="btn ghost" onClick={() => void 배포토큰()}>
              {지금.deployKey === null && 배포원문 === null ? t('발급') : t('다시 발급')}
            </button>
          </div>
          <배포한줄 바탕={지금.publicUrl ?? window.location.origin} projectId={row.id} 원문={배포원문} />
        </구획>
      ) : null}

      {끊기묻기 ? (
        <Modal
          제목={t('{bts} 연결 해제', { bts: BTS이름 })}
          onClose={() => set끊기묻기(false)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set끊기묻기(false)}>
                {t('취소')}
              </button>
              <button type="button" className="btn danger" data-first onClick={() => void 끊기()}>
                {t('연결 해제')}
              </button>
            </>
          }
        >
          <p>{t('연결을 해제하면 이 프로젝트의 실패 판정은 QA Hub 에서 합니다')}</p>
        </Modal>
      ) : null}
    </div>
  );
}
