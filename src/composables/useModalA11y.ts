// Gestion a11y pour les modales: rendre l'arrière-plan inerte et déplacer le focus
// Objectif: éviter l'avertissement "Blocked aria-hidden on an element because its descendant retained focus"
// en s'assurant que le focus est sorti de #app avant que la modale masque l'arrière-plan.

let openModalsCount = 0

function blurActiveIfInsideApp() {
  try {
    const app = document.getElementById('app')
    const active = (document.activeElement as HTMLElement | null)
    if (app && active && app.contains(active)) {
      // Si l'élément focalisé est à l'intérieur de l'app, retirer le focus avant d'activer inert
      active.blur()
    }
  } catch {
    // no-op
  }
}

function setBackgroundInert(enable: boolean) {
  const app = document.getElementById('app')
  if (!app) return
  if (enable) {
    app.setAttribute('inert', '')
  } else {
    app.removeAttribute('inert')
  }
}

function focusFirstFocusable(root?: HTMLElement | null) {
  if (!root) return
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',')
  const el = root.querySelector(selector) as HTMLElement | null
  if (el) {
    try { el.focus({ preventScroll: true }) } catch {}
  } else {
    // fallback: focus le conteneur de dialog si focusable
    try { (root as HTMLElement).focus?.({ preventScroll: true }) } catch {}
  }
}

export function useModalA11y() {
  const onBeforeOpen = () => {
    // 1) Sortir le focus de l'arrière-plan
    blurActiveIfInsideApp()
    // 2) Activer inert sur l'arrière-plan au premier open
    if (openModalsCount === 0) {
      setBackgroundInert(true)
    }
    openModalsCount++
  }

  const onOpen = (el?: HTMLElement) => {
    // S'assurer que la modale a le focus
    // utiliser un microtask pour attendre l'insertion DOM
    queueMicrotask(() => focusFirstFocusable(el || undefined))
  }

  const onClose = () => {
    openModalsCount = Math.max(0, openModalsCount - 1)
    if (openModalsCount === 0) {
      setBackgroundInert(false)
    }
  }

  return { onBeforeOpen, onOpen, onClose }
}
