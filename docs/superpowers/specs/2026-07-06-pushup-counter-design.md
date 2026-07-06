# PushUp Counter — Design

**Data:** 2026-07-06
**Status:** Aprobat

## Scop

Aplicație web locală care numără automat flotările folosind camera telefonului și le scade dintr-o țintă zilnică configurabilă (default 100). Păstrează istoric complet cu statistici. Rulează 100% local, fără internet și fără costuri.

## Modul de utilizare

1. Utilizatorul pornește serverul pe laptop cu o singură comandă (`npm start`).
2. Serverul afișează în consolă adresa de accesat (ex. `https://192.168.1.15:3443`).
3. Utilizatorul intră pe adresă de pe telefon, acceptă certificatul local (o singură dată) și dă acces la cameră.
4. Sprijină telefonul lateral (1–2 m), astfel încât camera să-l vadă din profil.
5. Face flotări; aplicația le numără cu voce tare și le salvează pe server în timp real.

## Arhitectură

```
Laptop (Windows)                      Telefon (browser)
┌─────────────────────────┐          ┌──────────────────────────┐
│ Node.js server (HTTPS)  │  Wi-Fi   │ Pagina web:              │
│  • servește pagina      │◄────────►│  • cameră + MediaPipe    │
│  • API: /api/*          │          │    Pose (detecție local) │
│  • data/history.json    │          │  • contor mare + voce    │
└─────────────────────────┘          │  • pagina de statistici  │
                                     └──────────────────────────┘
```

- Detecția de postură rulează **pe telefon**, în browser, cu MediaPipe Pose. Fișierele modelului sunt incluse în proiect (funcționează offline).
- Serverul primește doar evenimente „+N flotări" și servește datele istorice.
- Niciun date nu părăsește rețeaua locală.

## Componente

### 1. Server (`server.js`)

Node.js, fără framework sau cu Express minimal. Responsabilități:

- Servește fișierele statice din `public/`.
- **HTTPS obligatoriu** (getUserMedia cere secure context): la prima pornire generează automat un certificat self-signed în `certs/` și îl refolosește la pornirile următoare.
- Afișează la pornire adresa LAN completă de accesat de pe telefon.
- API JSON:
  - `GET /api/state` — progresul de azi (făcute, țintă, rămase) + istoricul complet.
  - `POST /api/reps` — body `{ count: N }`; adaugă N flotări la ziua curentă și răspunde cu starea actualizată.
  - `PUT /api/goal` — body `{ goal: N }`; schimbă ținta zilnică (se aplică de azi înainte).
- Ziua curentă se determină pe server, după data locală a laptopului. Ce se face după miezul nopții intră în ziua nouă.

### 2. Stocare (`data/history.json`)

Fișier JSON lizibil, o intrare pe zi:

```json
{
  "goal": 100,
  "days": [
    { "date": "2026-07-06", "reps": 87, "goal": 100 }
  ]
}
```

- `goal` la nivel rădăcină = ținta curentă; fiecare zi îngheață ținta valabilă atunci.
- Scriere atomică (scrie în fișier temporar, apoi redenumește) ca să nu se corupă la întrerupere.

### 3. Logica de numărare (modul pur, `public/js/rep-counter.js`)

Mașină de stări pe unghiul cotului (umăr–cot–încheietură, calculat din landmark-urile MediaPipe):

- Stări: `UP` (braț întins, unghi > 150°) → `DOWN` (unghi < 90°) → revenire la `UP` = **1 flotare**.
- Se folosește brațul cel mai vizibil (scor de vizibilitate MediaPipe); se numără doar când punctele umăr/cot/încheietură au încredere peste prag.
- Pragurile (150°/90°, încredere minimă) sunt constante configurabile din setări.
- Modul e o funcție pură (primește landmark-uri, întoarce evenimente) — testabil fără cameră.

### 4. Logica de statistici (modul pur, `public/js/stats.js`)

Primește lista de zile, întoarce: streak curent și record de streak, medie zilnică, record de flotări/zi, total general, serii pe săptămâni/luni pentru grafic. Funcții pure, testate automat.

### 5. Interfața (trei ecrane, `public/`)

- **Azi**: cifră mare „mai ai X din Y", progres vizual, buton „Start antrenament", acces la setări (ținta zilnică, praguri detecție).
- **Antrenament**: preview cameră cu scheletul desenat peste, contor uriaș vizibil de la 2 m, voce care numără în română („unu, doi, trei…"; fallback engleză dacă telefonul nu are voce RO), indicator de stare detecție.
- **Statistici**: grafic pe zile/săptămâni (Chart.js, inclus local), streak, medie, recorduri.

Design mobil-first (utilizatorul folosește exclusiv telefonul pentru antrenament).

## Fluxul unei flotări

1. MediaPipe procesează cadrul video → landmark-uri.
2. `rep-counter` calculează unghiul cotului, avansează mașina de stări.
3. La o repetare completă: contorul UI crește, TTS pronunță numărul, se trimite `POST /api/reps {count: 1}`.
4. Serverul actualizează `history.json` și răspunde cu starea zilei.

## Cazuri limită și erori

| Situație | Comportament |
|---|---|
| Corp nedetectat / ieșit din cadru | Pauză numărare; mesaj pe ecran + anunț vocal o singură dată |
| Lumină slabă / detecție nesigură | Nu se numără sub pragul de încredere (preferăm rateuri față de numărări false); praguri ajustabile din setări |
| Țintă atinsă | Anunț vocal „Gata, Y din Y!", contor verde; se poate continua peste țintă |
| Telefon intră în sleep | Wake Lock API menține ecranul aprins în timpul antrenamentului |
| Conexiune pierdută spre laptop | Flotările se acumulează în pagină și se retrimit automat la reconectare |
| Certificat self-signed | Avertisment browser la prima accesare; instrucțiuni pas-cu-pas în README |
| Corupere fișier date | Scriere atomică; la citire eșuată se păstrează fișierul vechi și se raportează eroarea |

## Testare

- **Teste automate** (node:test): `rep-counter` (secvențe de unghiuri → număr corect de repetări, fără numărări false la mișcări parțiale) și `stats` (streak, medii, agregări, treceri peste miezul nopții) + API-ul serverului (adăugare repetări, schimbare țintă, rollover de zi).
- **Test manual ghidat**: primul antrenament real servește la calibrarea pragurilor de unghi/încredere.

## Decizii luate

- **Stack**: Node.js minimal + vanilla JS (fără build step) — ales în locul React/Express/SQLite (complexitate inutilă) și al PWA-ului doar-pe-telefon (datele ar fi prizoniere în browserul telefonului).
- **Datele pe laptop**, nu pe telefon: supraviețuiesc schimbării telefonului, vizibile de oriunde din rețea.
- **Detecția pe telefon**, nu pe server: fără streaming video prin rețea, latență zero.
- **Vedere din profil** ca mod principal de detecție (unghiul cotului), cu praguri ajustabile.

## În afara scopului (deocamdată)

- Conturi multiple / mai mulți utilizatori.
- Alte exerciții (genuflexiuni, abdomene).
- Acces din afara rețelei locale.
- Aplicație nativă / notificări push.
