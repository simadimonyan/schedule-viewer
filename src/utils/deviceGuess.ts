/**
 * Догадка об устройстве для поля «Устройство» в обращении в поддержку.
 *
 * Строка — подсказка человеку, а не диагностика: он её видит и правит.
 * Полный userAgent уходит отдельно, в logs.json.
 *
 * Две оговорки про userAgent:
 *  - Safari с iOS 26 замораживает версию ОС в UA на 18_x, настоящая
 *    версия видна только в `Version/26.x` — берём большую из двух;
 *  - Chrome на Android прячет модель («Android 10; K»). Модель и версию ОС
 *    отдают client hints — `refineDeviceGuess` дотягивает их асинхронно.
 */

interface UaDataLike {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string }>
}

function browserOf(ua: string): string {
  const rules: Array<[RegExp, string]> = [
    [/YaBrowser\/(\d+)/, 'Яндекс Браузер'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/EdgA?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/FxiOS\/(\d+)/, 'Firefox'],
    [/Firefox\/(\d+)/, 'Firefox'],
    [/CriOS\/(\d+)/, 'Chrome'],
    [/Chrome\/(\d+)/, 'Chrome'],
    [/Version\/(\d+(?:\.\d+)?).*Safari/, 'Safari'],
  ]
  for (const [re, name] of rules) {
    const m = re.exec(ua)
    if (m) return `${name} ${m[1]}`
  }
  return ''
}

function iosVersion(ua: string): string {
  const os = /OS (\d+)_(\d+)(?:_(\d+))?/.exec(ua)
  const safari = /Version\/(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(ua)
  const osVer = os ? [os[1], os[2], os[3]].filter(Boolean).join('.') : ''
  if (safari && Number(safari[1]) >= 26 && (!os || Number(safari[1]) > Number(os[1]))) {
    return [safari[1], safari[2] ?? '0', safari[3]].filter(Boolean).join('.')
  }
  return osVer
}

export function guessDevice(ua = navigator.userAgent): string {
  const browser = browserOf(ua)
  const withBrowser = (base: string) => (browser ? `${base} · ${browser}` : base)

  const apple = /(iPhone|iPad|iPod)/.exec(ua)
  // iPadOS притворяется маком — выдаёт его сенсорный экран.
  const ipadAsMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  if (apple || ipadAsMac) {
    const kind = apple?.[1] ?? 'iPad'
    const ver = iosVersion(ua)
    const os = kind === 'iPad' ? 'iPadOS' : 'iOS'
    return ver ? `${kind} (${os} ${ver})` : kind
  }

  const android = /Android (\d+(?:\.\d+)?)(?:; ([^;)]+))?/.exec(ua)
  if (android) {
    const model = android[2] && android[2] !== 'K' && !/Linux|wv/.test(android[2]) ? android[2].trim() : ''
    const base = model ? `${model} (Android ${android[1]})` : `Android ${android[1]}`
    return withBrowser(base)
  }

  if (/Windows/.test(ua)) return withBrowser('Windows')
  if (/Macintosh|Mac OS X/.test(ua)) return withBrowser('Mac')
  if (/CrOS/.test(ua)) return withBrowser('ChromeOS')
  if (/Linux/.test(ua)) return withBrowser('Linux')
  return withBrowser('Неизвестное устройство')
}

/** Уточнение через client hints (Chromium): модель Android и Windows 10/11. */
export async function refineDeviceGuess(): Promise<string | null> {
  const data = (navigator as Navigator & { userAgentData?: UaDataLike }).userAgentData
  if (!data?.getHighEntropyValues) return null
  try {
    const hints = await data.getHighEntropyValues(['model', 'platformVersion'])
    const browser = browserOf(navigator.userAgent)
    const tail = browser ? ` · ${browser}` : ''
    if (data.platform === 'Android') {
      const ver = hints.platformVersion?.split('.')[0]
      const model = hints.model?.trim()
      if (!model && !ver) return null
      return `${model || 'Android'}${ver ? ` (Android ${ver})` : ''}${tail}`
    }
    if (data.platform === 'Windows' && hints.platformVersion) {
      const major = Number(hints.platformVersion.split('.')[0])
      return `${major >= 13 ? 'Windows 11' : 'Windows 10'}${tail}`
    }
  } catch {
    // Браузер отказал в подсказках — остаёмся при догадке из UA.
  }
  return null
}
