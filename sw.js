// 余白の Service Worker（ビルド時に vite.config.ts で版番号と事前保存の一覧を埋め込む）
// ・アプリ本体は事前に保存し、オフラインでも起動できるようにする
// ・画面（HTML）は通信を優先し、つながらないときは保存したものを使う
// ・新しい版はすぐには切り替えず、画面の「更新」操作（SKIP_WAITING）で切り替える
// ・課題データ（IndexedDB）には触れない。外部への通信もしない
const VERSION = '1.0.0-mv9c0nba'
const CACHE = `yohaku-${VERSION}`
const FONT_CACHE = 'yohaku-fonts'
const PRECACHE = ["./","./assets/index-B_e3WJKS.js","./assets/index-DBUPH0W8.css","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('yohaku-') && k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put('./', copy))
          }
          return res
        })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((hit) => hit || caches.match(req))),
    )
    return
  }

  // フォント：使った分だけ保存（不変のファイル名なので保存を優先）
  if (/\.(woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(FONT_CACHE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone())
              return res
            }),
        ),
      ),
    )
    return
  }

  // そのほかのファイル：保存したものを優先し、無ければ取得して保存
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && url.pathname.includes('/assets/')) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
