# Front Camera Calibration Design

**Data:** 2026-07-06
**Status:** Aprobat

## Scop

Aplicatia trebuie sa functioneze cu telefonul pus in fata utilizatorului, folosind implicit camera frontala. In loc sa ceara corp complet din profil, utilizatorul calibreaza pozitia `Sus` si pozitia `Jos`, iar contorul foloseste aceste exemple ca referinta.

## Comportament

- Camera implicita devine `Fata`.
- Vocea numara repetarile in engleza: `one`, `two`, `three`, etc.
- In ecranul de antrenament exista doua butoane de calibrare:
  - `Salveaza Sus`
  - `Salveaza Jos`
- O repetare este valida doar cand miscarea seamana cu tranzitia calibrata `Sus -> Jos -> Sus`.
- Daca nu exista calibrare, aplicatia cere calibrare inainte sa numere.

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
