# Virtuel think-aloud: Airbnb-prototype

Lowfi-prototype af Airbnb-appen til think-aloud-test af, hvordan lejere vælger og booker deres næste destination.

```bash
npm install
npm run dev        # http://localhost:4321
```

| Side | Hvem | Hvad |
| --- | --- | --- |
| `/` | Deltager | Skriver navn, får opgaven og bruger appen frit. Tanker skrives eller dikteres, og spørgsmål dukker op undervejs. |
| `/?mode=free` | Forsker | Udforsk prototypen uden at gemme noget. |
| `/admin` | Forsker | Kræver adgangskode. Studio: sessioner, svar pr. spørgsmål, søgning, CSV-eksport og redigering af alt indhold. |

## Adgangskode

Studio er beskyttet med adgangskoden `123`. Skift den ved at sætte miljøvariablen `STUDIO_PASSWORD`, fx
`STUDIO_PASSWORD=noget-langt npm run dev`. Deltagerne skal ikke bruge kode – de kan kun gemme deres egen session.

## Data

- `data/content.json`: spørgsmål, boliger, destinationer, kategorier og indstillinger. Redigeres i Studio.
- `data/sessions.json`: deltagernes sessioner (tanker, svar, skærmforløb med tidsstempler).

Diktering ("Sig det højt") bruger browserens talegenkendelse og virker i Chrome, Edge og Safari.
Ved hosting skal serveren have en disk, der bevares mellem genstarter (fx Render, Railway eller en VPS),
fordi svarene gemmes som filer.
