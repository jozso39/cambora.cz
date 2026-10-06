#!/usr/bin/env node
// Renders docs/ (what GitHub Pages serves) from src/. No dependencies.
//
//   node build.mjs
//
// One page per language: docs/index.html (en) and docs/cs/index.html (cs),
// plus the shared assets. docs/ is committed on purpose: GitHub Pages serves
// it straight from the branch, so nothing builds anywhere else.
//
// The build also fetches every project link and writes what it got next to
// the project ("checked 6 Oct 2026 · 200 OK"). The page claims things are
// running; this is how the claim gets tested rather than typed.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { content, site } from './src/content.js'

const root = dirname(fileURLToPath(import.meta.url))
const out = join(root, 'docs')
const origin = `https://${site.domain}`
const now = new Date()
const tz = 'Europe/Prague'
const builtDate = {
  en: now.toLocaleDateString('en-GB', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' }),
  cs: now.toLocaleDateString('cs-CZ', { timeZone: tz }),
}
const builtTime = now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })

/** Fetch one link the way a visitor would; never throws, never aborts the build. */
async function check(url) {
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'cambora.cz build check (+https://cambora.cz)' },
    })
    return { status: r.status }
  } catch (e) {
    return { status: 0, error: e.name }
  }
}

const checks = new Map()
const urls = [...new Set(content.en.work.projects.map((p) => p.link?.href).filter(Boolean))]
await Promise.all(urls.map(async (u) => checks.set(u, await check(u))))
for (const [u, c] of checks) console.log(`  ${c.status || c.error}  ${u}`)

/** Czech typography: a one-letter preposition never ends a line. */
const nbsp = (s) => s.replace(/(^|[\s(„])([KkSsVvZzAaIiOoUu])\s(?=\S)/g, '$1$2 ')

/** Apply nbsp() to every string in the Czech content, except link targets. */
function typeset(value, key = '') {
  if (typeof value === 'string') return key === 'href' || key === 'otherHref' ? value : nbsp(value)
  if (Array.isArray(value)) return value.map((v) => typeset(v, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeset(v, k)]))
  }
  return value
}

/** The name with only the háček in red: a red Č underneath, the ink C on top. */
const hacekName = (name) =>
  name.replace(
    'Čambora',
    '<span class="nw"><span class="ch"><span class="under">Č</span><span class="over">C</span></span>ambora</span>',
  )

function verifyLine(t, p) {
  if (!p.link) return `<span class="chk">${t.verify.noLink}</span>`
  const c = checks.get(p.link.href)
  const what = c.status === 200 ? '200 OK' : c.status ? `HTTP ${c.status}` : t.verify.noAnswer
  return `<a href="${p.link.href}">${p.link.label}</a> <span class="chk">· ${t.verify.checked} ${builtDate[t.lang]} · ${what}</span>`
}

function project(t, p) {
  return `
  <section class="row">
    <aside class="gutter"><span>${p.when}</span><span>${p.status}</span></aside>
    <div class="body">
      <h3>${p.title}</h3>
      <p>${p.text}</p>
      <p class="meta">${p.stack}<br>${verifyLine(t, p)}</p>
    </div>
  </section>`
}

function page(raw) {
  const t = raw.lang === 'cs' ? typeset(raw) : raw
  const base = t.lang === 'cs' ? '../' : './'
  const url = origin + t.path
  const other = content[t.other]
  const home = base + (t.lang === 'cs' ? 'cs/' : '')

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jozef Čambora',
    jobTitle: t.lang === 'cs' ? 'AI inženýr' : 'AI engineer',
    url: origin + '/',
    image: `${origin}/${site.og}`,
    sameAs: [site.github, site.linkedin],
    worksFor: { '@type': 'Organization', name: 'Medevio' },
    address: { '@type': 'PostalAddress', addressLocality: 'Prague', addressCountry: 'CZ' },
  }

  const built = t.footer.built.replace('{date}', builtDate[t.lang]).replace('{time}', builtTime)

  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.description}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="${t.lang}" href="${url}">
<link rel="alternate" hreflang="${other.lang}" href="${origin + other.path}">
<link rel="alternate" hreflang="x-default" href="${origin}/">
<meta property="og:type" content="profile">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${t.description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${origin}/${site.og}">
<meta property="og:locale" content="${t.lang === 'cs' ? 'cs_CZ' : 'en_US'}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="${site.themeLight}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${site.themeDark}" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${base}fonts/bricolage-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}style.css">
<script type="application/ld+json">${JSON.stringify(person)}</script>
</head>
<body>
<a class="skip" href="#main">${t.skip}</a>
<header class="top">
  <a class="brand" href="${home}">cambora.cz</a>
  <nav aria-label="${t.navLabel}">
    <a href="#now">${t.nav.now}</a>
    <a href="#work">${t.nav.work}</a>
    <a href="#before">${t.nav.before}</a>
    <a href="#contact">${t.nav.contact}</a>
    <a class="lang" href="${t.otherHref}" hreflang="${other.lang}" lang="${other.lang}">${t.otherLabel}</a>
  </nav>
</header>

<main id="main" class="page">
  <section class="hero">
    <img class="photo" src="${base}${site.photo}" width="480" height="480" alt="${t.hero.photoAlt}" fetchpriority="high">
    <h1 aria-label="${t.hero.name}"><span aria-hidden="true">${hacekName(t.hero.name)}</span></h1>
    <p class="role">${t.hero.role}</p>
    ${t.hero.intro.map((p) => `<p class="intro">${p}</p>`).join('\n    ')}
    <p class="meta links"><a href="${site.github}">${t.hero.links.github}</a> · <a href="${site.linkedin}">${t.hero.links.linkedin}</a> · <a href="#contact">${t.hero.links.email}</a></p>
  </section>

  <section id="now" class="row first">
    <aside class="gutter"><span class="k">${t.now.k}</span><span>${t.now.sub}</span></aside>
    <div class="body">
      <h2>${t.now.title}</h2>
      ${t.now.paras.map((p) => `<p>${p}</p>`).join('\n      ')}
      <p class="meta">${t.now.stack}</p>
    </div>
  </section>

  <section id="work" class="row">
    <aside class="gutter"><span class="k">${t.work.k}</span></aside>
    <div class="body"><p class="lead">${t.work.lead}</p></div>
  </section>${t.work.projects.map((p) => project(t, p)).join('')}
  <section class="row">
    <aside class="gutter"></aside>
    <div class="body"><p class="meta">${t.work.more} <a href="${site.github}">github.com/jozso39</a></p></div>
  </section>

${t.before.items
    .map(
      (i, n) => `
  <section class="row"${n === 0 ? ' id="before"' : ''}>
    <aside class="gutter">${n === 0 ? `<span class="k">${t.before.k}</span>` : ''}<span>${i.when}</span></aside>
    <div class="body">
      <h3>${i.where}</h3>
      <p><span class="rolename">${i.role}.</span> ${i.text}</p>
    </div>
  </section>`,
    )
    .join('')}
  <section class="row">
    <aside class="gutter"></aside>
    <div class="body"><p class="meta">${t.before.certs}</p></div>
  </section>

  <section id="contact" class="row">
    <aside class="gutter"><span class="k">${t.contact.k}</span></aside>
    <div class="body">
      <p>${t.contact.text}</p>
      <div class="hacek" id="hacek" data-u="${site.email.u}" data-d="${site.email.d}" data-t="${site.email.t}">
        <p class="meta hint" id="hint">${t.contact.hint}</p>
        <div class="stage">
          <span class="slot"><span class="caron" id="caron" aria-hidden="true" title="ˇ">ˇ</span></span>
          <span class="word">Jozef <button type="button" class="target" id="target" aria-label="${t.contact.targetLabel}" aria-describedby="hint" aria-pressed="false">C</button>ambora</span>
        </div>
        <div class="reveal" id="reveal" hidden>
          <p class="success">${t.contact.success}</p>
          <p class="addr"><a id="mail" href="#contact"></a> <button type="button" id="copy" class="meta" data-copied="${t.contact.copied}">${t.contact.copy}</button></p>
        </div>
        <noscript><p class="meta">${t.contact.noscript}</p></noscript>
      </div>
      <p class="meta">${t.contact.elsewhere} <a href="${site.github}">GitHub</a> · <a href="${site.linkedin}">LinkedIn</a>.</p>
    </div>
  </section>
</main>

<footer class="bottom">
  <p>${t.footer.made} <a href="${site.repo}">${t.footer.source}</a>.</p>
  <p>${built}</p>
  <p>${t.footer.domain}</p>
  <p>${t.footer.who} · <a href="${t.otherHref}" hreflang="${other.lang}" lang="${other.lang}">${t.otherLabel}</a></p>
</footer>
<script src="${base}site.js" defer></script>
</body>
</html>
`
}

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'cs'), { recursive: true })

writeFileSync(join(out, 'index.html'), page(content.en))
writeFileSync(join(out, 'cs', 'index.html'), page(content.cs))

cpSync(join(root, 'src', 'style.css'), join(out, 'style.css'))
cpSync(join(root, 'src', 'site.js'), join(out, 'site.js'))
cpSync(join(root, 'src', 'assets'), out, { recursive: true })

// GitHub Pages plumbing: the custom domain, and no Jekyll pass over the output.
writeFileSync(join(out, 'CNAME'), `${site.domain}\n`)
writeFileSync(join(out, '.nojekyll'), '')
writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`)
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${Object.values(content)
  .map(
    (t) => `  <url>
    <loc>${origin + t.path}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${origin}/"/>
    <xhtml:link rel="alternate" hreflang="cs" href="${origin}/cs/"/>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
)

const dashes = [content.en, content.cs].flatMap((t) => JSON.stringify(t).match(/[–—]/g) || [])
if (dashes.length) console.warn(`warning: ${dashes.length} long dash(es) in content`)
console.log('built docs/ for', Object.keys(content).join(', '), `at ${builtDate.en} ${builtTime}`)
