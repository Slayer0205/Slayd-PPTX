param([switch]$Upload)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    & npm.cmd run test:e2e
    if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed.' }
    if ($Upload) {
        # Explicit operator action; always preview, never the production branch.
        & npx.cmd wrangler pages deploy dist --project-name slidecraft-ai-beta-uz --branch v07-preview
        if ($LASTEXITCODE -ne 0) { throw 'Preview upload failed.' }
    } else {
        Write-Host 'Validated locally. No upload performed. Use -Upload only when preview upload is intended.'
    }
} finally { Pop-Location }
