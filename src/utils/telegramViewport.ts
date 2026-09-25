/* Отступы Telegram Mini App в полноэкранном режиме.
 *
 * Из профиля бота («Открыть приложение») Telegram запускает Main Mini App во
 * весь экран: статус-бар телефона и кнопки Telegram («Закрыть», ⌄, ⋮) лежат
 * поверх страницы, и без отступа шапка сайта уезжает под них. Из кнопки в чате
 * режим обычный — там отступы нулевые, и ничего не меняется.
 *
 * Высоту перекрытия знает только JS SDK Telegram (safeAreaInset — системная
 * зона, contentSafeAreaInset — кнопки Telegram), поэтому SDK подгружается
 * только внутри Telegram, а отступы кладутся в CSS-переменные: --tg-safe-top
 * (статус-бар), --tg-content-top (строка кнопок Telegram), их сумма
 * --tg-top-inset. В полноэкранном режиме на <html> ставится data-tg-fullscreen,
 * и шапка перестраивается в строку кнопок Telegram (AppHeader.vue). Вне
 * Telegram переменных нет, и везде действует запасное значение 0px. */

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js'

type Inset = { top?: number; bottom?: number; left?: number; right?: number }

type TelegramWebApp = {
  ready?: () => void
  onEvent?: (event: string, cb: () => void) => void
  safeAreaInset?: Inset
  contentSafeAreaInset?: Inset
  isFullscreen?: boolean
}

type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramWebApp } }

/* Telegram передаёт параметры запуска в хэше (#tgWebAppData=…&tgWebAppPlatform=…),
 * а SDK сохраняет их в sessionStorage — после SPA-перехода хэша уже нет. */
function launchedInTelegram(): boolean {
  if (/tgWebApp(Data|Platform|Version)=/.test(window.location.hash)) return true
  try {
    return Boolean(sessionStorage.getItem('__telegram__initParams'))
  } catch {
    return false
  }
}

function applyInsets(app: TelegramWebApp) {
  const safeTop = Math.max(0, app.safeAreaInset?.top ?? 0)
  const contentTop = Math.max(0, app.contentSafeAreaInset?.top ?? 0)
  const bottom = (app.safeAreaInset?.bottom ?? 0) + (app.contentSafeAreaInset?.bottom ?? 0)
  const html = document.documentElement
  html.style.setProperty('--tg-safe-top', `${safeTop}px`)
  html.style.setProperty('--tg-content-top', `${contentTop}px`)
  html.style.setProperty('--tg-top-inset', `${safeTop + contentTop}px`)
  html.style.setProperty('--tg-bottom-inset', `${Math.max(0, bottom)}px`)
  // Старые клиенты не знают isFullscreen — тогда полноэкранность видна по строке кнопок.
  const fullscreen = app.isFullscreen ?? contentTop > 0
  html.toggleAttribute('data-tg-fullscreen', fullscreen && contentTop > 0)
}

function attach(app: TelegramWebApp) {
  applyInsets(app)
  const update = () => applyInsets(app)
  for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged']) {
    app.onEvent?.(ev, update)
  }
  app.ready?.()
}

export function initTelegramViewport() {
  if (!launchedInTelegram()) return
  const w = window as TelegramWindow
  if (w.Telegram?.WebApp) {
    attach(w.Telegram.WebApp)
    return
  }
  const script = document.createElement('script')
  script.src = SDK_URL
  script.async = true
  script.onload = () => {
    const app = (window as TelegramWindow).Telegram?.WebApp
    if (app) attach(app)
  }
  document.head.appendChild(script)
}
