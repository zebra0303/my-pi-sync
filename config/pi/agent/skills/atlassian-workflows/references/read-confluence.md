Confluence 문서를 읽고 내용을 정리해주세요.

## Input

사용자가 Confluence URL 또는 페이지 ID를 전달합니다. `$ARGUMENTS`는 pi prompt template에서 전달된 인자 또는 사용자의 현재 요청에서 받은 인자로 해석합니다.

URL이 전달되지 않은 경우 사용자에게 URL을 요청하세요.

## 동작 방식

### 1. Shortcut URL 처리

URL이 `/wiki/x/` 형식(shortcut URL)인 경우, 먼저 리다이렉트를 따라가서 실제 URL을 얻습니다:

```bash
curl -s -L -o /dev/null -w "%{url_effective}" -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" "<SHORTCUT_URL>"
```

반환된 URL에서 credentials가 포함되어 있을 수 있으므로, 페이지 ID만 추출하여 사용합니다.

### 2. 문서 읽기

```bash
confluence read "<URL 또는 PAGE_ID>" --format markdown
```

### 3. 메타데이터 확인 (필요시)

```bash
confluence info "<URL 또는 PAGE_ID>"
```

### 4. 결과 정리

읽어온 내용을 보기 좋게 정리하여 사용자에게 보여주세요.

### 5. 환경변수 미설정 시

`confluence` 명령어가 실패하면 아래 안내를 출력합니다:

> Confluence 환경변수가 설정되지 않았습니다. `~/.zshrc`에 아래 내용을 추가하세요:
>
> ```sh
> export CONFLUENCE_DOMAIN="lunit.atlassian.net"
> export CONFLUENCE_API_PATH="/wiki/rest/api"
> export CONFLUENCE_AUTH_TYPE="basic"
> export CONFLUENCE_EMAIL="your-email@lunit.io"
> export CONFLUENCE_API_TOKEN="your-api-token"
> ```
>
> API 토큰은 https://id.atlassian.com/manage-profile/security/api-tokens 에서 생성할 수 있습니다.
