# PushUp Counter

Aplicatie web locala care numara automat flotarile prin camera telefonului si le scade dintr-o tinta zilnica. Datele raman pe laptop, in reteaua ta locala.

## Instalare

Ruleaza o singura data:

```bash
npm install
node scripts/fetch-vendor.mjs
```

Scriptul descarca local Chart.js, MediaPipe Tasks Vision si modelul Pose Landmarker.

## Pornire

```bash
npm start
```

Serverul afiseaza adresele disponibile, de forma:

```text
https://192.168.1.15:3443
https://localhost:3443
```

## Pe telefon

1. Conecteaza telefonul la aceeasi retea Wi-Fi ca laptopul.
2. Deschide adresa `https://<ip-laptop>:3443` in browser.
3. La avertismentul de certificat, intra la optiuni avansate si continua catre pagina locala.
4. Accepta accesul la camera.
5. Sprijina telefonul lateral, la 1-2 metri, astfel incat camera sa te vada din profil.
6. Apasa `Start antrenament`.

## Cum functioneaza

- Camera ruleaza in browserul telefonului.
- Detectia corpului se face local cu MediaPipe Pose.
- O flotare este numarata cand bratul trece din pozitia sus, in pozitia jos, apoi inapoi sus.
- Fiecare repetare se trimite la server si se salveaza in `data/history.json`.
- Daca telefonul pierde conexiunea temporar, repetarile se tin in coada si se retrimit la urmatorul succes.

## Setari

Tinta zilnica se schimba din ecranul `Azi`.

Pragurile implicite pentru numarare sunt in [public/js/rep-counter.js](public/js/rep-counter.js):

- brat intins: peste 150 de grade
- brat indoit: sub 90 de grade
- vizibilitate minima landmark: 0.5

## Teste

```bash
npm test
```

## Fisiere generate local

Acestea nu sunt comise in git:

- `certs/` - certificatul HTTPS self-signed
- `data/history.json` - istoricul tau de flotari
- `node_modules/` - dependentele npm
