// The only JavaScript on cambora.cz: the háček puzzle in front of the e-mail.
//
// The address is assembled here, from data attributes, only after a person
// drags the háček onto the C (or taps the C). It never appears in the HTML, so
// a scraper matching e-mail patterns in the page source finds nothing. This is
// a nuisance for harvesters and a small smile for humans, not real security.
(() => {
  const box = document.getElementById('hacek')
  if (!box) return
  const caron = document.getElementById('caron')
  const target = document.getElementById('target')
  const reveal = document.getElementById('reveal')
  const mail = document.getElementById('mail')
  const copy = document.getElementById('copy')
  const letters = [...document.querySelectorAll('#word .l'), target]
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  let solved = false
  let lit = null

  const address = () => `${box.dataset.u}@${box.dataset.d}.${box.dataset.t}`

  function solve() {
    if (solved) return
    solved = true
    box.classList.add('solved')
    // Same trick as the name in the header: red Č underneath, ink C on top,
    // so only the háček itself turns red.
    target.innerHTML = '<span class="under">Č</span><span class="over" aria-hidden="true">C</span>'
    target.setAttribute('aria-pressed', 'true')
    target.classList.remove('over')
    caron.hidden = true
    const a = address()
    mail.href = `mailto:${a}`
    mail.textContent = a
    reveal.hidden = false
    mail.focus({ preventScroll: true })
  }

  // Tap, click, Enter or Space on the C: the keyboard path is the button itself.
  target.addEventListener('click', solve)

  // Dragging the ˇ. Pointer events cover mouse, touch and pen alike.
  let drag = null

  // A háček goes above a letter, so a letter counts as "under" the hook from
  // most of a letter-height above it down to its baseline.
  const under = (el, x, y, pad = 0) => {
    const r = el.getBoundingClientRect()
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - r.height * 0.8 && y <= r.bottom + pad
  }
  const overTarget = (x, y) => under(target, x, y, 14)

  // Where the hook itself is: a little above the middle of the carried box.
  const hook = (e) => [e.clientX - drag.dx + drag.w / 2, e.clientY - drag.dy + drag.h * 0.42]

  function sparkle(el) {
    el.classList.remove('spark')
    void el.offsetWidth // restart the animation if it is still running
    el.classList.add('spark')
    if (calm) return
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('span')
      s.className = i % 2 ? 'sparkle ink' : 'sparkle'
      const a = Math.random() * Math.PI * 2
      const d = 18 + Math.random() * 16
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`)
      s.style.setProperty('--dy', `${Math.sin(a) * d - 8}px`)
      s.addEventListener('animationend', () => s.remove())
      el.appendChild(s)
    }
  }

  caron.addEventListener('pointerdown', (e) => {
    if (solved || drag) return
    e.preventDefault()
    const r = caron.getBoundingClientRect()
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height }
    caron.classList.add('dragging')
    caron.style.width = `${r.width}px`
    caron.style.height = `${r.height}px`
    move(e)
  })

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return
    caron.style.left = `${e.clientX - drag.dx}px`
    caron.style.top = `${e.clientY - drag.dy}px`
    const [x, y] = hook(e)
    target.classList.toggle('over', overTarget(x, y))
    const now = letters.find((l) => under(l, x, y)) || null
    if (now !== lit) {
      lit = now
      if (now) sparkle(now)
    }
  }

  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return
    const [x, y] = hook(e)
    const hit = overTarget(x, y)
    drag = null
    lit = null
    caron.classList.remove('dragging')
    caron.style.left = caron.style.top = caron.style.width = caron.style.height = ''
    target.classList.remove('over')
    if (hit) solve()
  }

  // On the document, not the caron: once it is position:fixed under a moving
  // finger, events are not reliably delivered to the element itself.
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', drop)
  document.addEventListener('pointercancel', drop)

  // Copy the revealed address. Falls back to selecting it where the clipboard
  // API is unavailable (plain http, old browsers).
  copy.addEventListener('click', async () => {
    const a = address()
    try {
      await navigator.clipboard.writeText(a)
    } catch {
      const range = document.createRange()
      range.selectNodeContents(mail)
      const sel = getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    const label = copy.textContent
    copy.textContent = copy.dataset.copied
    setTimeout(() => { copy.textContent = label }, 1500)
  })
})()
