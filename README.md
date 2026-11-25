# T-Lynx

Endless runner pixel-art en TypeScript + Vite (PWA), hecho con HTML5 Canvas 2D y Web Audio API, sin motores de juego.

**Jugar:** https://pl290723.github.io/t-lynx/

[![Deploy a GitHub Pages](https://github.com/PL290723/t-lynx/actions/workflows/deploy.yml/badge.svg)](https://github.com/PL290723/t-lynx/actions/workflows/deploy.yml)

## Controles

| Acción | Teclado | Pantalla táctil |
| :--- | :--- | :--- |
| Saltar (mantener = más alto) | Espacio, Flecha Arriba o W | Tocar o mantener |
| Agacharse / caída rápida | Flecha Abajo o S | Deslizar hacia abajo |
| Silenciar sonido | M | — |

## Ejecutar en local

Requiere Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Abrir http://localhost:5173/t-lynx/

## Despliegue

Cada push a `main` compila el proyecto y lo publica en GitHub Pages con el workflow `.github/workflows/deploy.yml`. También se puede lanzar a mano desde la pestaña **Actions** (Run workflow).

## Equipo

- Arias Banda Manuel
- Melgar Obrajero Jairo Antonio
- Rivera Lara Paulo Cesar