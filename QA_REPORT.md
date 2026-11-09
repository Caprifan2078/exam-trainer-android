# QA_REPORT — Экзаменатор 0.9.26
Дата: 2026-11-09. Примечание: отчёт фиксирует результаты именно известных CI и локальную проверку полученного APK, **не** физического Android.

## Тестируемое состояние
GitHub code commit: `4f3dd2f8e5f0ba8dd27ff6798a91566ede514b51` (первый подтверждённый код в этом обновлении; прежнее свидетельство CI ниже относится к старому коммиту), branch `qa/recovery-audit-20261109`.
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

## Дополнительная регрессия 2026-11-09
**Запуск:** https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42539955041, коммит workflow `1cbc15ac34db4bb94c8a90ed4b4367bb6a115ef1`, кодовый коммит `4f3dd2f8e5f0ba8dd27ff6798a91566ede514b51`.

### RED → GREEN
- `42539068628` fail: отсутствует предупреждение сохранения текста; `42539309845` success: предупреждение, сохранение в памяти, восстановление записи и reload.
- `42539603606` fail: сохранённая работа не открылась при отказе `exam-review-*`; `42539767805` success: сохранённая работа открылась с прежним текстом несмотря на отказ записи, предупреждение и повторная запись прошли тест.

### Итоговый CI
- Windows/Electron job: success, включая оба новых теста и прежние проверки ввода, ссылок, формул, сохранения.
- Android build job: success, включая 450 полных решений, независимые 3000 случайных заданий, синтаксис JS, Gradle, apksigner, package verification.
- Android-emulator-smoke job: success; emulator Android API 30 x86_64; установка через adb, Activity `io.github.caprifan2078.examtrainer.MainActivity` запущена со статусом OK; 10 с спустя PID присутствовал; стартовый скриншот `13640739179` показывает главный экран «Экзаменатора».
- Артефакт `ExamTrainer-0.9.26-Recovery-Android-QA`, artifact ID `13641210372`, ZIP SHA256 `cf5bd52ab13c98d0722d0c4996667bb0831acb059ab7f186023a447c9e8b97d4`; извлечённый APK SHA256 `0346828d494e8cdefdae233850d616d7d10470f478cc0b4649031dd92f6ca93e`. CRC ZIP и APK пройдены, `review.js` и `sheet-ui.js` содержат новый API в двух местах восстановления.
- **Ограничения:** UI в эмуляторе проверен только на стартовом экране, не проверены ввод в 3 разделах, сохранение, экспорт XLSX, Back, поворот, другие Android API и физическое устройство. Подпись по-прежнему debug и может отличаться при следующем запуске CI. `main` не затронут.
