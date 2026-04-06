# WatchNime Next (React + Express)

Frontend sekarang sudah di-upgrade ke **React UI** (CDN runtime) dengan multi-tab modern (Home, Explore, Jadwal, Bookmark, Profile), layout desktop + mobile, dan siap deploy ke Vercel.

## Jalankan lokal

```bash
npm start
```

Buka `http://localhost:3000`.

## API utama

- `GET /api/latest?page=1`
- `GET /api/search?q=naruto`
- `GET /api/detail?url=<anime-url>`
- `GET /api/watch?url=<episode-url>`

Source scraper backend sudah diganti ke `s2.animekuindo.life`.
