# Script para arrancar el servidor en modo LOCAL (Windows)
# Uso:
#   .\start-local.ps1                       (usa el password del .env.local que ya tengas)
#   .\start-local.ps1 -MysqlPassword "abc"  (te lo aplica al .env.local)

param(
    [string]$MysqlPassword = ""
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# 1) Asegurar que existe .env.local
if (-not (Test-Path ".env.local")) {
    Write-Error "No existe .env.local en la carpeta server/"
    exit 1
}

# 2) Si pasaron password, lo escribimos en .env.local
if ($MysqlPassword -ne "") {
    (Get-Content ".env.local") -replace '^DB_PASSWORD=.*', "DB_PASSWORD=$MysqlPassword" |
        Set-Content ".env.local"
    Write-Host "Password actualizado en .env.local" -ForegroundColor Green
}

# 3) Copiar .env.local -> .env (que es el que lee Node)
Copy-Item ".env.local" ".env" -Force
Write-Host "Usando configuracion LOCAL (MySQL en 127.0.0.1)" -ForegroundColor Cyan

# 4) Mostrar IP local para que sepas qué poner en el .ino
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.InterfaceAlias -match "Wi-?Fi|Ethernet" -and $_.IPAddress -notlike "169.*" } |
       Select-Object -First 1).IPAddress
if ($ip) {
    Write-Host ""
    Write-Host "IP local detectada: $ip" -ForegroundColor Yellow
    Write-Host "  -> En el .ino:   const char* websocket_server = `"$ip`";"
    Write-Host "  -> Navegador:    http://${ip}:8080/"
    Write-Host "  -> Thunder/WS:   http://${ip}:8080/api  |  ws://${ip}:8080"
    Write-Host ""
}

# 5) Instalar dependencias si falta node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Cyan
    npm install
}

# 6) Arrancar
node server.js
