Read a Confluence page and summarize its contents.

## Input

The user provides a Confluence URL or page ID. `$ARGUMENTS` means arguments passed through the pi prompt template or the user's current request.

If no URL or page ID is provided, ask the user for one.

## Workflow

### 1. Handle shortcut URLs

If the URL uses the `/wiki/x/` shortcut format, first follow redirects to resolve the actual URL:

```bash
curl -s -L -o /dev/null -w "%{url_effective}" -u "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" "<SHORTCUT_URL>"
```

The returned URL may include credentials. Extract only the page ID and use that for follow-up commands.

### 2. Read the page

```bash
confluence read "<URL or PAGE_ID>" --format markdown
```

### 3. Check metadata when needed

```bash
confluence info "<URL or PAGE_ID>"
```

### 4. Summarize the result

Present the retrieved content in a clear, readable summary.

### 5. Missing environment variables

If the `confluence` command fails because credentials or environment variables are missing, show this guidance:

> Confluence environment variables are not configured. Add the following to `~/.zshrc`:
>
> ```sh
> export CONFLUENCE_DOMAIN="lunit.atlassian.net"
> export CONFLUENCE_API_PATH="/wiki/rest/api"
> export CONFLUENCE_AUTH_TYPE="basic"
> export CONFLUENCE_EMAIL="your-email@lunit.io"
> export CONFLUENCE_API_TOKEN="your-api-token"
> ```
>
> You can create an API token at https://id.atlassian.com/manage-profile/security/api-tokens.
