# PS Media Player

Ein moderner Android Universal-Media-Player mit frei anpassbarem RGB/Glow-Design.

## Stand 0.1

- Android App mit Jetpack Compose
- Media3 / ExoPlayer Playback Core
- lokale Audio- und Videodateien per Android-Dateiauswahl
- direkte Stream-URLs
- HLS, DASH, RTSP und SmoothStreaming vorbereitet
- eigener Player mit Play/Pause, 10 Sekunden vor/zurück, Seekbar und Lautstärke
- Video-Ausgabe über Media3 PlayerView
- animierte Audio-Ansicht
- RGB Design Studio
  - Hauptfarbe
  - Zweitfarbe
  - Glow-Farbe
  - RGB-Regler für jede Farbe
  - Glow-Stärke
  - Bewegung an/aus
  - Flow-Geschwindigkeit
  - Presets Cyber, Fire und Ice
- Design wird lokal gespeichert

## Ziel

Der PS Media Player soll Schritt für Schritt zu einem High-End Universalplayer werden. Geplant sind unter anderem:

- MediaSession + Sperrbildschirm-/Bluetooth-Steuerung
- echte Hintergrundwiedergabe als MediaSessionService
- Playlists und lokale Medienbibliothek
- Cover und Metadaten
- Audio-Visualizer mit mehreren Stilen
- Equalizer und Audio-Effekte
- Untertitel- und Tonspur-Auswahl
- Wiedergabegeschwindigkeit
- Picture-in-Picture
- Netzwerk/NAS
- Dropbox als optionale Medienquelle
- Chromecast / TV
- später optionaler VLC/FFmpeg-Fallback für exotische Formate
- mehrere speicherbare Benutzer-Themes

## Build

Die GitHub Actions Pipeline baut bei Push auf `main` automatisch eine Debug-APK. Die APK wird anschließend als Workflow-Artefakt bereitgestellt.

Toolchain:

- Android Gradle Plugin 9.4.0
- Gradle 9.6.0
- JDK 17
- Kotlin 2.3.21
- Compose BOM 2026.08.00
- Media3 1.11.0

## Hinweis

Nicht jedes DRM-geschützte Format oder jeder geschützte Streamingdienst kann durch einen Universalplayer frei wiedergegeben werden. Solche Inhalte benötigen die jeweiligen Lizenzen und DRM-Integrationen.
