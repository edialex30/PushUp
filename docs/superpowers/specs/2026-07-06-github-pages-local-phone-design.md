# GitHub Pages Local Phone Design

**Data:** 2026-07-06
**Status:** Aprobat

## Scop

Aplicatia trebuie sa ruleze de pe GitHub Pages cu laptopul inchis. Camera, numararea, istoricul, tinta zilnica si statisticile ruleaza si se salveaza exclusiv in browserul telefonului.

## Decizii

- Aplicatia devine statica pentru utilizarea normala: `public/index.html`, CSS, JS si vendor assets pot fi publicate pe GitHub Pages.
- Datele se salveaza in `localStorage` pe telefon, nu pe server.
- Serverul Node ramane optional pentru dezvoltare locala, dar frontend-ul nu mai depinde de `/api/*`.
- Istoricul nu se sincronizeaza intre telefoane si poate fi pierdut daca utilizatorul sterge datele site-ului.

## Date Salvate

```json
{
  "goal": 100,
  "cameraMode": "environment",
  "days": [
    { "date": "2026-07-06", "reps": 42, "goal": 100 }
  ]
}
```

- `goal` este tinta curenta.
- `cameraMode` este `environment` pentru camera din spate sau `user` pentru camera frontala.
- Fiecare zi pastreaza tinta valabila atunci.

## Interfata

- Ecranul `Azi` pastreaza progresul si editarea tintei.
- Ecranul `Azi` primeste un control `Flotari azi`, cu input numeric si buton `Actualizeaza`, pentru corectarea manuala a numarului detectat.
- Ecranul `Antrenament` primeste un selector `Spate` / `Fata`; alegerea se salveaza local si este folosita la pornirea camerei.

## Testare

- Modul nou `public/js/local-store.js`, testat cu `node:test` si un storage fake.
- Teste existente pentru rep counter si statistici raman.
- Verificare finala: `npm test`, `node --check` pentru modulele browser.
