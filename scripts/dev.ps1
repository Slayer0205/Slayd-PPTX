$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    & npm.cmd run dev
    if ($LASTEXITCODE -ne 0) { throw 'Development server failed.' }
} finally { Pop-Location }
