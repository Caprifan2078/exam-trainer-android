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

## 2026-11-09 — полноценный Android WebView CI-тест
- Код приложения: `2a6b6d8a48a2e60a81f1a61324ea27522e188763`: `MainActivity.java` разрешает DevTools **только в debuggable-сборках**, не в release.
- Тест: `scripts/android-webview-regression.cjs`: Chrome DevTools Protocol по `adb forward` к **реальному Android WebView**. Проверяет НМЦК, бюджет, финансовый анализ, сохранённую формулу, проверку ответа, письменный вывод, сохранённые работы, восстановление после перезапуска процесса, окно системного экспорта XLSX и Android Back.
- Первая попытка CI `42546220525`: Android/Windows сборки успешны, принудительная остановка процесса сразу после записи не оставила черновика (без ожидания фонового сброса DOM storage).
- Диагностическая попытка `42546596075`: с ограниченной паузой 1,8 с перед остановкой черновик, ответы и текст сохранены; тест застрял на настоящем подтверждении открытия работы. Это проблема тестового обработчика диалога; не доказательство дефекта приложения.
- Проверенный результат: `42546955988`, коммит сценария `eaece5a1383a29081ed05336101e0cf872f69cb2`; все **3 GitHub Actions jobs SUCCESS** (Android build/math, Windows/Electron, Android emulator API 30 full functional scenario). Подтверждены все три раздела, редактор, проверка, текст, сохранение, восстановление после остановки с паузой, системный picker XLSX и аппаратная Back.
- APK из артефакта ID `13643990802`, название `ExamTrainer-0.9.26-Recovery-Android-QA`; ZIP SHA256 `c395876f761ab1bf1ab75298e7963dfe3c143d835faabaa26c9ae101753c2c9c`; извлечённый APK SHA256 `18aab3cc178b45d080e720dfdf33ea73eeb5ec36ab5ae29263b3c5f7c738772b` (102487 bytes). CRC ZIP/APK успешны; новый `review.js` и `sheet-ui.js` на месте.
- Не доказано: запись XLSX в целевой файл через DocumentsUI (только появление окна), ориентация экрана, мгновенная безусловная потеря процесса до сброса на диск, реальное физическое устройство, стабильность debug-подписи.

## Трёхчасовой экзамен — 2026-11-09
- Изменён режим «Экзамен»: 3 задания и одно ограничение 03:00:00. Код зафиксирован в `af4b8fe085da657f9c312a2844a38836fce163e`.
- Добавлены/дополнены тесты `desktop/exam-timer-test.cjs` и `scripts/android-webview-regression.cjs`: единый срок, смена задания, перезагрузка, возврат, автоматическое завершение, сохранность ответов и текстов, блокировка после истечения времени, обучение без таймера.
- Локальная статическая проверка: код изменённого JS синтаксически корректен в V8. **Новые Windows/Android тесты ещё не завершились — все соответствующие runs находятся в очереди.** Не утверждать, что изменение прошло полный QA, пока это не подтвердит GitHub Actions.

## 2026-11-09 — запрос владельца: общий экзамен 3 часа
- Режим «Экзамен» объединяет три задания в порядке НМЦК → бюджет → финансовый анализ, с **одним абсолютным deadline через 3 часа**; режим «Обучение» остаётся без ограничения. Сохранены переходы между заданиями, черновик, продолжение с главного экрана и после перезапуска.
- При истечении срока таймер показывает `00:00:00`, текущая и незапущенные работы оцениваются, ответы блокируются, результаты сохраняются. Старые сохранённые работы не удалены; редактирование завершённого экзамена запрещено.
- Проверенный CI: https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42604794799 — **3/3 jobs success**: Windows/Electron, Android build, реальный Android WebView API 30 (общий 3h deadline, переход к следующему заданию, resume, restart, имитация истечения срока, lockout).
- Кодовая точка: `77c81a7` (основная реализация) и последующие тестовые/регрессионные исправления до `f70864214b80aa5533fad68b05893fed94d6217c`. Ветка QA, `main` не менялась.
- Новый APK: artifact `13666379494` из run `42604794799`; ZIP SHA256 `cd7a207b97fc5b362adb4f30b3afb0e079d60a0b16cbf2439cef13b7e39e11cb`, APK SHA256 `b365a3286bc29a438769bb820e3b7cd06d8a020a5c47dbfe33638b7e642d72b7`; оба архивных CRC прошли, в APK подтверждена константа `EXAM_DURATION_MS=3*60*60*1000`.
- **Ограничение:** Android hardware Back на эмуляторе остался нестабильным: тест сообщил WARN, внутриприкладная кнопка возврата прошла. Не считать hardware Back исправленным. Debug-подпись CI временная, на физическом телефоне не тестировалось.

## 2026-11-09 — готовые Windows EXE и Android APK с трёхчасовым экзаменом
- [GitHub Actions run 42615041676](https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42615041676): три jobs SUCCESS — Windows/Electron tests + `electron-builder --win portable --x64`, Android Gradle+математика, Android WebView на эмуляторе API 30.
- Windows: artifact `13671723075`, ZIP `ExamTrainer-0.9.26-ThreeHour-Windows-Portable-EXE`, SHA256 ZIP `20aac37851f9eb6be848497db7454ec75a092b233d8cc300e24caf224fa10056`. EXE `ExamTrainer-0.9.26-Windows-QA.exe`: 69 942 983 bytes, SHA256 `966b5485c8ec0fcdd95e4a91c625f0d5190b9abf07e5b97c6452ac92fd400f9f`. CI verified `win-unpacked/resources/assets/index.html` and `sheet-ui.js` contain 3-hour exam implementation; ZIP CRC and EXE PE/MZ signature checked locally. Test on owner's PC still not performed.
- Android: artifact `13671802765`, ZIP `ExamTrainer-0.9.26-Recovery-Android-QA`, SHA256 ZIP `94de6ddfb650d48158299d452b4d72f89565564fc6875396dbca3f147b06732e`. Extracted APK 103 714 bytes, SHA256 `f48694cf2111c496490ed24ee11189a785d581213005650c9531c9ff144f3963`. APK ZIP CRC verified, both assets contain new exam configuration.
- Time expiration confirmed by simulated clock advancement (not a 3-hour wall-clock wait); remaining time persists after restart, three results graded, editor locked. Learning remains unlimited.
- Remaining risks: debug APK signature may differ on future builds; do not uninstall old app without saving data. Physical Android and owner Windows startup not tested. Native Android Back has WARN; in-app Back passed.
- Code: no changes from `f70864214b80aa5533fad68b05893fed94d6217c`; CI-only commit `6008fa3735fd7db1cf4429b033da883eba60181a`. Main untouched.

## 2026-11-10 — согласованные улучшения экзамена и резервных копий
- **Пользователь согласовал:** (1) сдачу этапов без преждевременного раскрытия оценок, (2) три самостоятельных XLSX, без объединения, (3) оценивание только после получения преподавательских критериев, (4) резервные копии/безопасные обновления, (6) более устойчивый офлайн-таймер. Android Back и реальное сохранение XLSX остаются отдельными открытыми QA-задачами.
- Код `cfc288da2ec8343a024197b5b5619a2f70f51a28`: `#check` в полном экзамене сдаёт текущий этап, не показывает ошибки и баллы; этап блокируется, статус сохраняется при перезапуске; подсказки и проверка письменного вывода до финала скрыты. Предупреждение при попытке откатиться к старой копии сданного экзамена. Обучение работает как прежде.
- Проверен CI `42723830526`: **3/3 SUCCESS** (Windows, Android Gradle, Android WebView API30).
- Код `18eb88a8ebb6dc25649fa513aa8a01eccfde1d6a`: `examNow()` использует монотонный таймер + системное время, не даёт продлить экзамен простым переводом часов назад во время работы; сохраняет watermark, показывает предупреждение. **Не защищает от намеренного обхода с администраторским доступом или изменения часов при долгом выключении.**
- Проверен CI `42724450268`: **3/3 SUCCESS** (включая тесты rollback clock).
- Код `f3390e02ca90b27dccfb297462db29e7aa4ebe21`: добавлена офлайн-резервная копия JSON с черновиком, сохранёнными работами, выводами и статистикой; импорт валидируется и требует подтверждения; Android Native SAF-сохранение JSON и WebView-пикер импорта. XLSX по-прежнему отдельные по заданиям. Тест `desktop/backup-test.cjs` и CI `42725104086` на момент записи проходят проверку; финальный статус следует смотреть в GitHub Actions.
- **Не решено:** постоянный закрытый signing key для безопасных обновлений Android; не коммитить ключ в git. Реальный импорт/экспорт JSON через Android picker и запись XLSX на диск, устройство владельца и быстродействие EXE требуют отдельных практических проверок. Нельзя объявлять публичным релизом.

## Финальный QA 2026-11-10 — экспорт пользовательских артефактов
- Проверенный run [42725104086](https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42725104086): **3/3 SUCCESS** (Android Gradle/package, Windows/Electron editor+timer+backup tests и portable EXE, Android WebView API30).
- Новые артефакты: Android APK `13722760371`, архив SHA256 `26033250ecf13e8426c4282dd842370efca5a2c80ebb45ba3824079ae9444792`; Windows EXE `13721868866`, архив SHA256 `0db2c263a88ab1311f9db4557beafeeb6c655ba38d42a73b8d78de4fe852c5b7`.
- Отдельно извлечены файлы и проверены ZIP CRC: Android APK **109197 bytes** SHA256 `57afc93ceb4f66e20385b0384a46a7b1822ad9d84b574446d20dd2deea92197e`, внутри APK проверены ZIP CRC, `assets/backup.js` и константа трёхчасового таймера; Windows EXE **69945776 bytes** SHA256 `2f81b195e6debcb3ff871faf61a9f9d3f363c7bd1c68cd2d888dee7f6d8dafce`, заголовок PE/MZ проверен.
- `desktop/backup-test.cjs`: полноценное восстановление через выбираемый JSON-файл с подтверждением, проверены черновик, сохранённая работа, письменный вывод; reject неизвестных ключей. Android CI подтвердил наличие JSON-backup и нативного интерфейса, но **не выполнил фактическую запись/импорт JSON через Android DocumentsUI**. Не выдавать за проверенный реальный мобильный backup/restore.
- Открыто: постоянная подпись APK, физический телефон, реальный файл XLSX и JSON на Android, аппаратная Back (WARN), пользовательский запуск EXE, официальные критерии преподавателя. `main` не тронут.
