# pi environment bootstrap

새 Mac/PC를 받았을 때 현재와 같은 pi 환경을 빠르게 재현하기 위한 개인 bootstrap repo입니다.

## 포함된 것

- Node/npm/pi 버전 pin: [`versions.env`](versions.env), [`.nvmrc`](.nvmrc)
- Homebrew 의존성: [`Brewfile`](Brewfile)
- pi 전역 설정: [`config/pi/agent/settings.json`](config/pi/agent/settings.json)
- pi 기본 지침 및 Git convention: [`config/pi/agent/AGENTS.md`](config/pi/agent/AGENTS.md)
- pi prompt templates: [`config/pi/agent/prompts/`](config/pi/agent/prompts/)
- 설치 스크립트: [`scripts/install.sh`](scripts/install.sh)
- 현재 pi 설정 백업 스크립트: [`scripts/backup-pi.sh`](scripts/backup-pi.sh)
- 환경 점검 스크립트: [`scripts/check.sh`](scripts/check.sh)

## 절대 커밋하지 않는 것

다음은 secret 또는 개인 작업 기록이라 git에 넣지 않습니다.

- `~/.pi/agent/auth.json` — OAuth/API 인증 정보
- `~/.pi/agent/sessions/` — 대화/session 로그
- `~/.pi/agent/bin`, `git`, `npm` — 생성/설치 artifact

## 기본 Git convention

모든 pi 작업에서 `~/.pi/agent/AGENTS.md`에 저장된 Git convention을 기본으로 사용합니다.

- Commit: `<type>(<scope>): <subject>`
- PR title: `<type>(<scope>): <subject> [Ticket Number]`
- 기본 merge strategy: Squash & Merge
- Review comment prefix: `P1`–`P5`

## 새 Mac에서 복구하기

```bash
git clone <this-repo-url> ~/Garage/pi
cd ~/Garage/pi
./scripts/install.sh
./scripts/check.sh
```

설치 스크립트는 Homebrew가 이미 설치되어 있다는 전제로 `nvm`, pinned Node/npm, `pi`, `pnpm`, pi 설정 파일을 복구합니다.

설치 후 pi에서 다시 로그인합니다.

```bash
pi
# pi 안에서 /login 실행
```

## 현재 환경 백업하기

pi 설정을 바꾼 뒤 repo에 반영하려면:

```bash
./scripts/backup-pi.sh
git status
git add .nvmrc Brewfile config versions.env scripts README.md .gitignore
git commit -m "Update pi environment"
```

## 환경 점검

```bash
./scripts/check.sh
```

## 현재 기준 환경

- macOS arm64
- Node.js `24.15.0` via nvm
- npm `11.12.1`
- `@earendil-works/pi-coding-agent` `0.74.0`
- pnpm `11.0.8`

## 별도 관리가 필요한 참조 리소스

현재 pi 설정은 아래 경로를 참조합니다. 이 repo에는 아직 내용물을 포함하지 않았으므로, 필요하면 별도 repo/submodule 또는 추가 백업 대상으로 관리하세요.

- `~/.claude/commands`
- `~/.codex/skills/atlassian-workflows`
