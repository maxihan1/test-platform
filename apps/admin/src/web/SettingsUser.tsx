// 설정 화면의 계정 구획 (SPEC §8.8). 아이디·이름·운영·서비스와 권한·대시보드
// 비밀번호는 사람이 타이핑하지 않는다 — 시스템이 만들어 한 번만 보여준다

import { useState } from 'react';

import { AgentToken, AgentTokenBox, type 발급토큰 } from './AgentToken.js';
import { api, type SettingsServiceRow, type UserRow, type 배정 } from './api.js';
import { use말, use언어 } from './i18n.js';
import type { 등급 } from './role.js';
import { TempPassword, type 임시 } from './SettingsPassword.js';
import { PermissionPicker, PermissionSummary, 배정이틀렸나 } from './SettingsPermissions.js';
import { 오류문장 } from './SettingsService.js';
import { 계정못보내는이유, 마지막운영계정인가 } from './settingsView.js';

export function UserSection({
  rows: 전체,
  services,
  me,
  onDone,
  onSelf,
}: {
  rows: UserRow[];
  services: SettingsServiceRow[];
  /** 지금 로그인한 사람의 아이디. 자기 자신을 고치면 띠까지 다시 그려야 한다 */
  me: string;
  onDone: () => void;
  onSelf: () => void;
}) {
  const t = use말();
  // 승인 대기는 위 묶음(SettingsPending)이 그린다. 여기 섞으면 편집으로 수락을 건너뛴다 — 서버도 PATCH 를 409 로 막는다
  const rows = 전체.filter((it) => it.isApproved !== false);
  const [여는것, set여는것] = useState<string | 'new' | null>(null);
  // 만든 직후 한 번만 보여준다. 닫으면 다시 못 본다 (SPEC §8.8)
  const [임시비밀번호, set임시비밀번호] = useState<임시 | null>(null);
  const [토큰, set토큰] = useState<발급토큰 | null>(null);

  // 내가 배정받은 서비스가 없으면 그것부터 알린다. 첫 운영자가 이 화면에 오는 가장 흔한 이유다
  const 내배정없음 = rows.find((it) => it.username === me)?.services.length === 0;

  return (
    <section className="sec">
      <div className="sec-h">
        <span>{t('계정')}</span>
        <button
          type="button"
          className="btn ghost icon"
          aria-label={여는것 === 'new' ? t('닫기') : t('더하기')}
          onClick={() => set여는것(여는것 === 'new' ? null : 'new')}
        >
          {여는것 === 'new' ? '×' : '+'}
        </button>
      </div>

      {내배정없음 && services.length > 0 ? (
        <div className="hint set-todo">
          {t('아직 자기 자신에게 배정한 서비스가 없습니다. 아래 자기 줄의 「편집」에서 배정합니다')}
        </div>
      ) : null}

      {임시비밀번호 === null ? null : <TempPassword 것={임시비밀번호} onClose={() => set임시비밀번호(null)} />}
      {토큰 === null ? null : <AgentTokenBox 것={토큰} onClose={() => set토큰(null)} />}

      {여는것 === 'new' ? (
        <UserForm
          services={services}
          onCreated={(username, password) => {
            set임시비밀번호({ username, password });
            set여는것(null);
            onDone();
          }}
        />
      ) : null}

      {rows.map((it) => (
        <div key={it.username}>
          <div className="set-row">
            <span className="set-name">
              {it.displayName}
              {it.isActive ? null : <span className="set-off">{t('비활성')}</span>}
            </span>
            <span className="set-sub">{it.username}</span>
            <PermissionSummary row={it} services={services} />
            <button
              className="btn ghost"
              onClick={() => set여는것(여는것 === it.username ? null : it.username)}
            >
              {여는것 === it.username ? t('닫기') : t('편집')}
            </button>
          </div>
          {여는것 === it.username ? (
            <UserForm
              row={it}
              rows={rows}
              나다={it.username === me}
              services={services}
              onDone={() => {
                set여는것(null);
                onDone();
                // 자기 자신을 고쳤으면 띠와 등급도 다시 읽는다
                if (it.username === me) onSelf();
              }}
              onPassword={(password) => set임시비밀번호({ username: it.username, password })}
            />
          ) : null}
          {여는것 === it.username ? <AgentToken row={it} onIssued={set토큰} onChanged={onDone} /> : null}
        </div>
      ))}
    </section>
  );
}

function UserForm({
  row,
  rows = [],
  나다 = false,
  services,
  onDone,
  onCreated,
  onPassword,
}: {
  row?: UserRow;
  rows?: UserRow[];
  /** 로그인한 사람 자신의 줄인가 */
  나다?: boolean;
  services: SettingsServiceRow[];
  onDone?: () => void;
  onCreated?: (username: string, password: string) => void;
  onPassword?: (password: string) => void;
}) {
  const t = use말();
  // 계정못보내는이유() 는 순수 모듈이라 훅을 못 쓴다. 언어를 여기서 꺼내 넘긴다
  const 언어 = use언어();
  const 새것 = row === undefined;
  const [username, setUsername] = useState(row?.username ?? '');
  const [displayName, setDisplayName] = useState(row?.displayName ?? '');
  const [role, setRole] = useState<등급>(row?.role ?? 'member');
  const [배정들, set배정들] = useState<배정[]>(row?.services ?? []);
  // 새 계정의 대시보드는 읽기로 시작한다 (§8.8)
  const [dashboard, setDashboard] = useState<'none' | 'read'>(row?.dashboard ?? 'read');
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 되돌릴 수 없는 일이라 두 걸음으로 받는다. 저장 버튼 바로 옆이라 잘못 누르기 쉽다
  const [비번확인, set비번확인] = useState(false);

  // 맞으면 등급을 낮추거나 내리는 길을 아예 안 그린다 (SPEC §3.5 · §7)
  const 마지막운영 = row !== undefined && 마지막운영계정인가(rows, row.username);
  const 못보내는이유 = 계정못보내는이유({ username, displayName, 새것 }, 언어);

  async function 한다(일: () => Promise<void>) {
    set보내는중(true);
    setErr(null);
    try {
      await 일();
    } catch (e) {
      setErr(오류문장(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="uf-id">{t('아이디')}</label>
        <input
          id="uf-id"
          type="text"
          value={username}
          disabled={!새것}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kim"
        />
      </div>

      <div className="field">
        <label htmlFor="uf-name">{t('이름')}</label>
        <input
          id="uf-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('김철수')}
        />
      </div>

      <PermissionPicker
        services={services}
        role={role}
        onRole={setRole}
        마지막운영={마지막운영}
        배정들={배정들}
        on배정들={set배정들}
        dashboard={dashboard}
        onDashboard={setDashboard}
      />

      {새것 ? (
        <div className="field">
          <span />
          <div className="hint">
            {t('비밀번호는 시스템이 만듭니다. 만든 직후')} <b>{t('한 번만')}</b> {t('보여 줍니다')}
          </div>
        </div>
      ) : null}

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <>
            {/* 자기 것을 재발급하면 세션 도장이 바뀌어 임시 비밀번호를 옮겨 적기 전에 로그아웃된다 */}
            {나다 ? (
              <span className="hint set-left">{t('자기 비밀번호는 사이드바의 「비밀번호 변경」에서 바꿉니다')}</span>
            ) : (
              // 되돌릴 수 없다. 왼쪽 끝으로 떼어 놓고 두 걸음으로 받는다
              <button
                className={`btn ghost set-left${비번확인 ? ' set-warn' : ''}`}
                disabled={보내는중}
                onClick={() => {
                  if (!비번확인) {
                    set비번확인(true);
                    return;
                  }
                  set비번확인(false);
                  void 한다(async () => {
                    const { tempPassword } = await api.resetPassword(row.username);
                    onPassword?.(tempPassword);
                  });
                }}
              >
                {비번확인 ? t('한 번 더 누르면 지금 비밀번호가 무효가 됩니다') : t('비밀번호 재발급')}
              </button>
            )}
            {마지막운영 ? null : (
              <button
                className="btn ghost"
                disabled={보내는중}
                onClick={() => {
                  void 한다(async () => {
                    await api.updateUser(row.username, { isActive: !row.isActive });
                    onDone?.();
                  });
                }}
              >
                {row.isActive ? t('비활성으로 내리기') : t('다시 활성으로')}
              </button>
            )}
          </>
        )}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        {/* 셋 다 안 씀인 묶음은 서버가 400 으로 돌려보낸다. 이유는 그 묶음 옆에 이미 적혀 있다 */}
        <button
          className="btn"
          disabled={보내는중 || 배정이틀렸나(배정들)}
          onClick={() => {
            if (못보내는이유 !== null) return;
            void 한다(async () => {
              if (새것) {
                const { tempPassword } = await api.createUser({ username, displayName, role, dashboard, services: 배정들 });
                onCreated?.(username, tempPassword);
              } else {
                await api.updateUser(row.username, { displayName, role, dashboard, services: 배정들 });
                onDone?.();
              }
            });
          }}
        >
          {새것 ? t('계정 추가') : t('저장')}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}
    </div>
  );
}
