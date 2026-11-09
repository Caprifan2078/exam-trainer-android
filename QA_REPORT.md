# QA_REPORT — Экзаменатор 0.9.26
Дата: 2026-11-09. Примечание: отчёт фиксирует результаты именно известных CI и локальную проверку полученного APK, **не** физического Android.

## Тестируемое состояние
GitHub code commit: `f8ec6e3cb50d96b88da61370358d879458762340`, branch `qa/recovery-audit-20261109`.
CI: https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538432247

### Windows/Electron (GitHub runner)
`cd desktop && npm install --no-audit --no-fund && node ui-test.cjs`

- Отказ ключа `examSheetsDraft` через тестовый `Storage.prototype.setItem`: до исправления RED `42537805046`; после исправления GREEN `42538042674`.
- Недоступность письменного вывода при отказе сохранения: до исправления RED `42538183819` (скрыт `#written-review`); после исправления GREEN `42538292688`.
- Консолидированный прогон двух исправлений: Windows job `128907813610` — success в run `42538432247`.
- Существующие проверки Electron: предложения формул, формулы со ссылками, отмена ввода, черновик после reload, переключение листов — прошли.

### Android (GitHub Ubuntu runner)
Job `128907813786` — success в run `42538432247`.
- Node QA: бюджетные коды с нулями, НМЦК и 44-ФЗ, НМЦК/бюджет/финансы, 450 полных решений, 1800 задач НМЦК, независимые 3000 случайных задач, письменные выводы, автодополнение — PASS; синтаксис всех assets JS проверен.
- Gradle 8.9 / JDK 17 / SDK 35: `gradle --no-daemon assembleDebug` — BUILD SUCCESSFUL.
- `apksigner verify --verbose` — success, `aapt dump badging` — package `io.github.caprifan2078.examtrainer.qa0926`, versionName `0.9.26-qa`, versionCode 31.
- Artifact `ExamTrainer-0.9.26-Recovery-Android-QA` ID `13639978880`, содержит `app-debug.apk`.
- ZIP SHA256 `857e1858527e2c8516136cd2be51163f5d555c5ad968c102cda1dcdda58bc5a8`; извлечённый APK SHA256 `2272b7d4c3c9fb8389dd0e7c629429a8472c15ac5772753cb2ab3459510d0c4f`.
- Локально проверено: ZIP/ APK CRC без ошибок; `assets/sheet-ui.js` содержит сообщение о сбое; `assets/review.js` читает `root.ExamCurrentTask`.

## Известные ограничения
- Нет реального Android UI/instrumentation прогона после исправлений и нет проверки на телефоне пользователя.
- Android APK подписан временным debug-ключом CI; стабильность обновления не доказана.
- `targetSdk=28` устарел, но не менялся без отдельного аудита.
- Приложение не является проверенным публичным релизом; соответствие всем методическим требованиям преподавателя не установлено.
