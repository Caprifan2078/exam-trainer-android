# CHANGELOG_DEV — Экзаменатор
## 2026-11-09 — восстановление и сохранность данных (0.9.26-qa)

Основа: `qa/recovery-audit-20261109`, создана от QA 0.9.26 без перезаписи `main`.

1. `98d3352` — воспроизводящий Electron-тест на отказ `localStorage.setItem('examSheetsDraft')`; RED https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42537805046 (интерфейс ложно сообщал об автосохранении).
2. `7b949ab` — `sheet-ui.js`: видимое предупреждение при ошибке сохранения, повторная успешная попытка убирает предупреждение; расширен регрессионный тест. GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538042674.
3. `b262eae` — тест письменного вывода при невозможности сохранить текущий черновик; RED https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538183819.
4. `eb08677` — `review.js`: источник актуального задания — уже существующий `root.ExamCurrentTask`, fallback — сохранённый черновик; GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538292688.
5. `f8ec6e3` — сфокусированный CI дополнен Android сборкой и штатным набором математических тестов; оба jobs GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538432247.

Ни версия приложения, ни package ID не повышались. Публичный Release не создавался. Установка APK на личный телефон **не проверена**. В GitHub использовались только QA-ветка и docs.

## 2026-11-09 — безопасное сохранение письменных выводов и QA Android-эмулятора
- `aaf1e715`: новый тест предупреждения при отказе `exam-review-*`; **RED** `42539068628`.
- `43764e89`: `review.js` показывает предупреждение и удерживает незаписанный текст по идентификатору задания, восстанавливает после временного переключения; **GREEN** `42539309845`.
- `17badd83`: тест открытия сохранённой работы при отказе вспомогательного сохранения; **RED** `42539603606`.
- `4f3dd2f8`: общий браузерный API восстановления текста из снимка; два пути `sheet-ui.js` (сохранённая работа, завершённый пробный экзамен), **GREEN** `42539767805`.
- `1cbc15ac`: подключён существующий `scripts/android-smoke.sh` для Android API 30 к восстановительному CI; **GREEN** `42539955041`.
- Android APK `0.9.26-qa` (версия не повышалась) проверен подписью, пакетом, математическими тестами, инсталляцией и стартом в эмуляторе. На физическом устройстве не испытан. Публичный Release не создавался.

## 2026-11-09 — расширенные Android-интеграционные тесты
- `2a6b6d8`: Debug-only WebView DevTools в `MainActivity.java`, CDP-сценарий `scripts/android-webview-regression.cjs` для Android API 30.
- `da4fee3`: добавлено диагностическое различение неуспевшей синхронизации DOM storage и восстановления после задержки 1,8 с.
- `eaece5a`: обрабатывает реальный JS confirm через CDP `Page.handleJavaScriptDialog` вместо тестовой подмены `window.confirm`.
- Полный CI `42546955988`: Windows, Android build и Android emulator integration — SUCCESS, тестовые логи по трём разделам, формуле, выводам, сохранению и восстановлению, Android picker и Back.
- Никаких изменений учебной бизнес-логики, версии, production или `main`; публичный release не создавался.

## 2026-11-09 — общий лимит 3 часа на экзамен
- Три задания объединены одним абсолютным deadline (`3*60*60*1000` мс); время не сбрасывается при переходах и перезапуске.
- По окончании времени учитываются незавершённые работы и пропущенные задания, редактирование блокируется.
- Добавлен возврат к незавершённому экзамену с главного экрана и подтверждение перед его заменой; обучение остаётся без времени.
- Сохранность письменного вывода при завершении на этапе загрузки, тесты Windows/Electron + Android WebView; дублирование тестов убрано.
- Состояние: код зафиксирован до `af4b8fe`, новые CI в очереди, APK с этим кодом ещё не заявлен как проверенный.

## 2026-11-09 — единый трёхчасовой экзамен
- Режим «Экзамен»: все три задания в одной сессии, единый дедлайн 10800000 мс, обратный отсчёт чч:мм:сс, продолжение без перезапуска срока и автофиниш с оценкой недоделанных работ.
- `77c81a7`: исходный функционал; `ed62314`: сохранение письменного вывода при истечении срока во время восстановления; дальнейшие коммиты по тестовой инфраструктуре.
- GREEN CI `42604794799`, ветка `qa/recovery-audit-20261109`, контрольный код `f708642`; 3/3 jobs success. APK artifact `13666379494`.
- Android Back на эмуляторе имеет независимый WARN, не выдавать за проверенный. Production/`main` не менялись.

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
