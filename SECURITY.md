# Security model

Motion Debugger executes bounded browser interactions on a local development app. Clicking or pressing keys can trigger application writes, including requests to local services. Treat it as an execution tool, not as a universally read-only observer.

## Safe targets

- Use trusted, credential-free loopback previews
- Never target banking, healthcare, payment, destructive-action or authenticated personal pages
- A fresh browser does not import your normal profile, but pages can still display private data without authentication
- Recordings are not automatically redacted. Review artifacts before sharing them

## Enforced limits

The recorder restricts origins, rejects credential-like URL parameters, blocks WebSockets, bounds recipes, and checks private/password targets. Source excerpts require explicitly configured read-only roots with realpath containment and size limits. These checks reduce risk; they are not a sandbox for hostile applications.

The MCP server cannot run arbitrary shell commands or modify source. Your coding agent retains its own permissions and approval requirements. The installer must preview persistent configuration changes and preserve unrelated entries.

## Reporting

Do not post credentials, private traces or exploitable details in a public issue. Use GitHub's private vulnerability-reporting feature if it is enabled for this repository; otherwise contact the repository owner privately before sharing sensitive material. No separate security email or response-time guarantee is established.

Only the latest reviewed release is intended for use. Experimental source branches may change without compatibility guarantees.
