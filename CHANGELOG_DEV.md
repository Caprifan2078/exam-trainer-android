# CHANGELOG_DEV — Экзаменатор
## 2026-11-09 — восстановление и сохранность данных (0.9.26-qa)

Основа: `qa/recovery-audit-20261109`, создана от QA 0.9.26 без перезаписи `main`.

1. `98d3352` — воспроизводящий Electron-тест на отказ `localStorage.setItem('examSheetsDraft')`; RED https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42537805046 (интерфейс ложно сообщал об автосохранении).
2. `7b949ab` — `sheet-ui.js`: видимое предупреждение при ошибке сохранения, повторная успешная попытка убирает предупреждение; расширен регрессионный тест. GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538042674.
3. `b262eae` — тест письменного вывода при невозможности сохранить текущий черновик; RED https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538183819.
4. `eb08677` — `review.js`: источник актуального задания — уже существующий `root.ExamCurrentTask`, fallback — сохранённый черновик; GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538292688.
5. `f8ec6e3` — сфокусированный CI дополнен Android сборкой и штатным набором математических тестов; оба jobs GREEN https://github.com/Caprifan2078/exam-trainer-android/actions/runs/42538432247.

Ни версия приложения, ни package ID не повышались. Публичный Release не создавался. Установка APK на личный телефон **не проверена**. В GitHub использовались только QA-ветка и docs.
