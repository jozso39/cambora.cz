#!/usr/bin/env node
// Renders docs/ (what GitHub Pages serves) from src/. No dependencies.
//
//   node build.mjs
//
// One page per language: docs/index.html (en) and docs/cs/index.html (cs),
// plus the shared assets. docs/ is committed on purpose — GitHub Pages serves
// it straight from the branch, so there is no build step anywhere else.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { content, site } from './src/content.js'

const root = dirname(fileURLToPath(import.meta.url))
const out = join(root, 'docs')
const origin = `https://${site.domain}`

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

const pills = (items, label) =>
  `<ul class="pills" aria-label="${label}">${items.map((s) => `<li>${s}</li>`).join('')}</ul>`

function project(p, t) {
  return `
      <article class="project">
        <header>
          <h3>${p.title}</h3>
          <span class="status ${p.state}">${p.status}</span>
        </header>
        <p class="tagline">${p.tagline}</p>
        <p>${p.desc}</p>${p.note ? `
        <p class="note">${p.note}</p>` : ''}
        ${pills(p.stack, t.stackLabel)}${p.link ? `
        <p><a class="more" href="${p.link.href}">${p.link.label}<span aria-hidden="true"> →</span></a></p>` : ''}
      </article>`
}

function page(raw) {
  const t = raw.lang === 'cs' ? typeset(raw) : raw
  const base = t.lang === 'cs' ? '../' : './'
  const url = origin + t.path
  const other = content[t.other]
  t.stackLabel = t.lang === 'cs' ? 'Technologie' : 'Stack'

  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jozef Čambora',
    jobTitle: t.lang === 'cs' ? 'AI inženýr' : 'AI Engineer',
    url: origin + '/',
    image: `${origin}/${site.og}`,
    sameAs: [site.github, site.linkedin],
    worksFor: { '@type': 'Organization', name: 'Medevio' },
    address: { '@type': 'PostalAddress', addressLocality: 'Prague', addressCountry: 'CZ' },
  }

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
<meta name="theme-color" content="${site.accentLight}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${site.accentDark}" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${base}style.css">
<script type="application/ld+json">${JSON.stringify(person)}</script>
</head>
<body>
<a class="skip" href="#main">${t.skip}</a>
<header class="top">
  <a class="brand" href="${base}${t.lang === 'cs' ? 'cs/' : ''}" aria-label="${t.hero.name}">JČ</a>
  <nav aria-label="${t.lang === 'cs' ? 'Navigace' : 'Navigation'}">
    <a href="#now">${t.nav.now}</a>
    <a href="#work">${t.nav.work}</a>
    <a href="#before">${t.nav.before}</a>
    <a href="#contact">${t.nav.contact}</a>
    <a class="lang" href="${t.otherHref}" hreflang="${other.lang}" lang="${other.lang}">${t.otherLabel}</a>
  </nav>
</header>

<main id="main">
  <section class="hero">
    <div class="hero-text">
      <h1>${t.hero.name}</h1>
      <p class="role">${t.hero.role}</p>
      ${t.hero.intro.map((p) => `<p class="intro">${p}</p>`).join('\n      ')}
      <p class="hero-links">
        <a href="${site.github}">${t.hero.links.github}</a>
        <a href="${site.linkedin}">${t.hero.links.linkedin}</a>
        <a href="#contact">${t.hero.links.email}<span aria-hidden="true"> ↓</span></a>
      </p>
    </div>
    <img class="photo" src="${base}${site.photo}" width="480" height="480" alt="${t.hero.photoAlt}" fetchpriority="high">
  </section>

  <section id="now" class="block">
    <p class="label">${t.now.label}</p>
    <h2>${t.now.title} <span class="since">${t.now.since}</span></h2>
    <p class="lead">${t.now.lead}</p>
    <ul class="bullets">
      ${t.now.bullets.map((b) => `<li>${b}</li>`).join('\n      ')}
    </ul>
    ${pills(t.now.stack, t.stackLabel)}
  </section>

  <section id="work" class="block">
    <p class="label">${t.work.label}</p>
    <h2>${t.work.title}</h2>
    <p class="lead">${t.work.intro}</p>
    <div class="projects">${t.work.projects.map((p) => project(p, t)).join('')}
    </div>
    <p class="more-github">${t.work.more} <a href="${site.github}">${t.work.moreLabel}</a></p>
  </section>

  <section id="before" class="block">
    <p class="label">${t.before.label}</p>
    <h2>${t.before.title}</h2>
    <dl class="timeline">
      ${t.before.items
        .map(
          (i) => `<div>
        <dt><span class="when">${i.when}</span> <span class="where">${i.where}</span></dt>
        <dd><strong>${i.role}</strong> — ${i.text}</dd>
      </div>`,
        )
        .join('\n      ')}
    </dl>
    <p class="certs">${t.before.certs}</p>
  </section>

  <section id="contact" class="block">
    <p class="label">${t.contact.label}</p>
    <h2>${t.contact.title}</h2>
    <p class="lead">${t.contact.text}</p>
    <div class="hacek" id="hacek" data-u="${site.email.u}" data-d="${site.email.d}" data-t="${site.email.t}">
      <p class="hint" id="hint">${t.contact.hint}</p>
      <div class="stage">
        <span class="slot"><span class="caron" id="caron" aria-hidden="true" title="ˇ">ˇ</span></span>
        <span class="word">Jozef <button type="button" class="target" id="target" aria-label="${t.contact.targetLabel}" aria-describedby="hint" aria-pressed="false">C</button>ambora</span>
      </div>
      <div class="reveal" id="reveal" hidden>
        <p class="success">${t.contact.success}</p>
        <p class="addr"><a id="mail" href="#contact"></a> <button type="button" id="copy" data-copied="${t.contact.copied}">${t.contact.copy}</button></p>
      </div>
      <noscript><p class="note">${t.contact.noscript}</p></noscript>
    </div>
    <p class="elsewhere">${t.contact.elsewhere} <a href="${site.linkedin}">LinkedIn</a> · <a href="${site.github}">GitHub</a>.</p>
  </section>
</main>

<footer class="bottom">
  <p>${t.footer.made} <a href="${site.repo}">${t.footer.source}</a>.</p>
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

console.log('built docs/ for', Object.keys(content).join(', '))
