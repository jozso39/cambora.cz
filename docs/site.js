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
  let solved = false

  const address = () => `${box.dataset.u}@${box.dataset.d}.${box.dataset.t}`

  function solve() {
    if (solved) return
    solved = true
    box.classList.add('solved')
    target.textContent = 'Č'
    target.setAttribute('aria-pressed', 'true')
    target.classList.remove('over')
    caron.hidden = true
    const a = address()
    mail.href = `mailto:${a}`
    mail.textContent = a
    reveal.hidden = false
    mail.focus({ preventScroll: true })
  }

  // Tap, click, Enter or Space on the C — the keyboard path is the button itself.
  target.addEventListener('click', solve)

  // Dragging the ˇ. Pointer events cover mouse, touch and pen alike.
  let drag = null

  const overTarget = (x, y) => {
    const r = target.getBoundingClientRect()
    const pad = 14
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
  }

  caron.addEventListener('pointerdown', (e) => {
    if (solved || drag) return
    e.preventDefault()
    const r = caron.getBoundingClientRect()
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top }
    caron.classList.add('dragging')
    caron.style.width = `${r.width}px`
    caron.style.height = `${r.height}px`
    move(e)
  })

  function move(e) {
    if (!drag || e.pointerId !== drag.id) return
    caron.style.left = `${e.clientX - drag.dx}px`
    caron.style.top = `${e.clientY - drag.dy}px`
    target.classList.toggle('over', overTarget(e.clientX, e.clientY))
  }

  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return
    const hit = overTarget(e.clientX, e.clientY)
    drag = null
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
