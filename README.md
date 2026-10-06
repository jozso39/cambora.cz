# cambora.cz

Jozef Čambora's portfolio page. One static page in two languages, no framework,
no build dependencies, hosted on GitHub Pages so it stays up when the home server
does not.

- English: <https://cambora.cz/>
- Česky: <https://cambora.cz/cs/>

## Layout

| Path | What |
|---|---|
| `src/content.js` | every word on the site, both languages — edit this |
| `src/style.css`, `src/site.js`, `src/assets/` | stylesheet, the háček puzzle, photo, favicon |
| `build.mjs` | renders `src/` into `docs/`; plain Node, zero dependencies |
| `docs/` | **generated** — what GitHub Pages serves (branch `main`, folder `/docs`) |

```bash
node build.mjs          # regenerate docs/
git commit -am "…" && git push     # Pages deploys from the branch, ~1 minute
```

`docs/` is committed on purpose: Pages serves it straight from the branch, so
nothing builds anywhere else. Always run the build before committing, never edit
`docs/` by hand.

The build fetches every project link and writes the result under the project
("checked 6 Oct 2026 · 200 OK"), plus the build date in the footer. A link that
does not answer is shown as such rather than hidden, so look at the build output
before pushing. The build also warns if a long dash sneaks into the content.

Fonts: Bricolage Grotesque (SIL Open Font License), self-hosted in
`src/assets/fonts/`, used for headings only. No third-party requests anywhere.

## The e-mail puzzle

The address is not in the HTML. `site.js` assembles it from `data-*` attributes
after the visitor drags the háček onto the C (or taps the C). It keeps the
address out of scrapers' regexes; it is not meant to stop a determined person.
Without JavaScript a spelled-out form is shown instead.

## DNS

Zone at Cloudflare, all records **DNS only** (grey cloud) so GitHub issues the
certificate:

- `cambora.cz` A → `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
- `cambora.cz` AAAA → `2606:50c0:8000::153` … `8003::153`
- `www` CNAME → `jozso39.github.io` (GitHub redirects it to the apex)

`docs/CNAME` holds the custom domain; the build writes it.
