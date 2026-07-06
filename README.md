# PushUp Counter

Aplicatie web statica pentru telefon, publicabila pe GitHub Pages. Numara automat flotarile prin camera telefonului, scade din tinta zilnica si pastreaza istoricul in browserul telefonului.

## Folosire pe telefon

1. Deschide linkul publicat pe GitHub Pages.
2. Accepta accesul la camera.
3. Camera implicita este `Fata`.
4. Pune telefonul in fata ta, astfel incat sa iti vada ambele brate.
5. Apasa `Start antrenament`.
6. Apasa `Calibreaza automat`.
7. Ai 5 secunde sa asezi telefonul la aproximativ 1 metru de tine.
8. Urmeaza vocea: tine pozitia `Sus`, apoi pozitia `Jos`, pana cand auzi `Calibration done`.
9. Incepe antrenamentul.

Aplicatia merge cu laptopul inchis dupa ce este publicata pe GitHub Pages.

## Date locale

Datele se salveaza in `localStorage`, in browserul telefonului:

- tinta zilnica
- istoricul pe zile
- camera preferata

Istoricul nu se sincronizeaza intre telefoane. Daca schimbi telefonul/browserul sau stergi datele site-ului, istoricul local se pierde.

## Cum functioneaza

- Camera ruleaza in browserul telefonului.
- Detectia corpului se face local cu MediaPipe Pose.
- O flotare este numarata cand miscarea seamana cu tranzitia calibrata `Sus -> Jos -> Sus`.
- Fiecare repetare se salveaza direct in browser.
- Daca detectia numara gresit, poti corecta manual campul `Flotari azi`.
- Vocea numara repetarile in engleza: `one`, `two`, `three`, etc.

## Setari

Din ecranul `Azi` poti schimba:

- tinta zilnica
- cate flotari ai facut azi

Din ecranul `Antrenament` poti alege camera:

- `Fata` pentru camera frontala, implicit
- `Spate` pentru camera principala

Tot din `Antrenament` poti rula `Calibreaza automat` oricand schimbi locul telefonului sau lumina.

Logica de numarare calibrata este in [public/js/calibrated-counter.js](public/js/calibrated-counter.js), iar flow-ul hands-free de calibrare este in [public/js/calibration-flow.js](public/js/calibration-flow.js).

## Dezvoltare locala

Instalare:

```bash
npm install
node scripts/fetch-vendor.mjs
```

Pornire locala optionala:

```bash
npm start
```

Serverul local este util pentru testare pe laptop/telefon, dar aplicatia publicata nu depinde de el.

## Publicare pe GitHub Pages

Repo-ul include workflow-ul `.github/workflows/pages.yml`, care publica automat folderul `public/`.

Pasii in GitHub:

1. Intra in repository settings.
2. Deschide `Pages`.
3. La `Build and deployment`, alege `GitHub Actions`.
4. Impinge codul pe `master` sau `main`.
5. Dupa ce workflow-ul trece, deschide linkul afisat de GitHub Pages.

## Teste

```bash
npm test
```

## Fisiere generate local

Acestea nu sunt comise in git:

- `certs/` - certificatul HTTPS self-signed
- `node_modules/` - dependentele npm
