# Recursos gráficos

Los recursos gráficos propios de **Boxing Arena** son originales y se generan sin depender de imágenes externas. La única dependencia de código externo es el motor Phaser 3.90.0.

| Archivo | Uso |
| --- | --- |
| `ring-logo.svg` | Emblema del juego, cargado con `preload()` en el menú. |
| `favicon.svg` | Icono de la pestaña del navegador. |
| `preview-menu.png` | Captura del menú principal para la documentación. |
| `preview-fight.png` | Captura del combate para la documentación. |
| `preview-result.png` | Captura de la pantalla de resultado para la documentación. |
| `vendor/phaser-3.90.0.min.js` | Copia local de respaldo de Phaser 3.90.0 (licencia MIT). El `index.html` carga primero el CDN. |

El escenario, el público, los boxeadores y los efectos visuales se dibujan en tiempo real con
Phaser Graphics y texturas generadas mediante Canvas, por lo que no se utilizan personajes
ni material protegido por derechos de autor.

Phaser 3 es un proyecto de Phaser Studio Inc. distribuido bajo licencia MIT.
