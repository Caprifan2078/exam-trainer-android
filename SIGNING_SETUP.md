# Подпись стабильной Android-сборки — ExamTrainer

**Статус:** workflow готов к использованию, но выпуск подписанного APK требует **однократной настройки секретов владельцем**. Пока этого нет, автоматическая QA-сборка остаётся подписанной временным debug-ключом, и безопасные обновления поверх прежних QA APK не гарантируются.

## Однократная настройка на доверенном компьютере

1. Установи JDK и создай приватный PKCS12 keystore. Пример:
   `keytool -genkeypair -v -keystore examtrainer-release.p12 -storetype PKCS12 -alias examtrainer -keyalg RSA -keysize 3072 -validity 10000`.
   Выбери длинный пароль, надёжно сохрани его и оригинал файла. **Никогда не помещай keystore в репозиторий, Issues, Pull Request или переписку.**
2. Выведи публичный SHA-256 отпечаток сертификата:
   `keytool -list -v -keystore examtrainer-release.p12 -storetype PKCS12 -alias examtrainer`.
3. На GitHub открой репозиторий → Settings → Secrets and variables → Actions → Repository secrets. Добавь:
   - `EXAMTRAINER_KEYSTORE_B64`: Base64 содержимого файла (PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("examtrainer-release.p12"))`).
   - `EXAMTRAINER_STORE_PASSWORD`: пароль хранилища.
   - `EXAMTRAINER_KEY_ALIAS`: `examtrainer`.
   - `EXAMTRAINER_KEY_PASSWORD`: пароль ключа (для PKCS12 обычно тот же, что пароль хранилища).
   - `EXAMTRAINER_CERT_SHA256`: **публичный** SHA-256 отпечаток из `keytool -list -v`.
4. Выбери Actions → `ExamTrainer owner-signed APK` → Run workflow, ветка `qa/recovery-audit-20261109`. Сценарий соберёт *неотладочный* APK, подпишет его, сверит отпечаток сертификата и выложит подписанный APK в артефакты. При отсутствии хотя бы одного секрета выпуск завершится ошибкой, не создавая ложную «подписанную» сборку.

**Миграция:** ранее выданные debug APK могли иметь разные подписи. Android не позволяет ставить новый APK с другой подписью поверх них. Прежде чем удалять старую установку, через «Резервная копия» сохрани и отдельно проверь JSON-файл. После установки новой постоянно подписанной версии восстанови его. Данные не удаляй, пока резервная копия не проверена. После первого перехода на постоянный ключ все дальнейшие обновления требуют **этот же ключ** и увеличенный versionCode.

Keystore — секрет владельца, поэтому ключи не генерируются и не публикуются в CI, а в Git сохраняются только сценарии и инструкции.
