# Front Camera Calibration Design

**Data:** 2026-07-06
**Status:** Aprobat

## Scop

Aplicatia trebuie sa functioneze cu telefonul pus in fata utilizatorului, folosind implicit camera frontala. In loc sa ceara corp complet din profil, utilizatorul calibreaza pozitia `Sus` si pozitia `Jos`, iar contorul foloseste aceste exemple ca referinta.

## Comportament

- Camera implicita devine `Fata`.
- Vocea numara repetarile in engleza: `one`, `two`, `three`, etc.
- In ecranul de antrenament exista un singur buton `Calibreaza automat`.
- Dupa apasarea butonului, utilizatorul are 5 secunde sa aseze telefonul la distanta.
- Aplicatia vorbeste instructiunile in engleza:
  - `Get ready`
  - countdown `five`, `four`, `three`, `two`, `one`
  - `Hold up position`
  - countdown `three`, `two`, `one`, apoi salveaza pozitia `Sus`
  - `Hold down position`
  - countdown `three`, `two`, `one`, apoi salveaza pozitia `Jos`
  - `Calibration done`
- O repetare este valida doar cand miscarea seamana cu tranzitia calibrata `Sus -> Jos -> Sus`.
- Daca nu exista calibrare, aplicatia cere calibrare inainte sa numere.
- In timpul calibrarii automate nu se numara repetari.
- Daca aplicatia nu vede clar bratele la capturarea unei pozitii, calibrarea se opreste si utilizatorul trebuie sa o reporneasca.

## Date Salvate

Calibrarea se salveaza in `localStorage` langa restul datelor:

```json
{
  "calibration": {
    "up": { "leftAngle": 160, "rightAngle": 158, "wristY": 0.72, "shoulderY": 0.38 },
    "down": { "leftAngle": 92, "rightAngle": 95, "wristY": 0.75, "shoulderY": 0.48 }
  }
}
```

## Testare

- Teste pentru default camera frontala si persistenta calibrarii.
- Teste pentru textul vocal englezesc.
- Teste pentru contorul calibrat: nu numara fara calibrare, numara `up -> down -> up`, ignora miscari mici.
- Teste pentru flow-ul de calibrare automata: salveaza `up` si `down`, esueaza fara features valide, nu salveaza cand este anulat.
