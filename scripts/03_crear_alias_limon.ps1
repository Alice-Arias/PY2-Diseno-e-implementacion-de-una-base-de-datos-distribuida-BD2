# ---------------------------------------------------------------------------------------
# SCRIPT: 03_crear_alias_limon.ps1
# DÓNDE: Windows (laptop A). Ejecutar PowerShell COMO ADMINISTRADOR.
#
# POR QUÉ: la replicación exige conectarse a Limón por su nombre real ("limon"),
# pero el contenedor escucha en localhost,1434. Este alias le dice a los clientes de
# SQL Server de Windows (SSMS y los agentes de replicación de San José) que
# "limon" = localhost,1434.
# Es lo mismo que crear el alias a mano en SQL Server Configuration Manager >
# SQL Native Client Configuration > Aliases (versiones 32 y 64 bits).
# ---------------------------------------------------------------------------------------

$alias = "limon"
$valor = "DBMSSOCN,localhost,1434"   # DBMSSOCN = TCP/IP

$rutas = @(
    "HKLM:\SOFTWARE\Microsoft\MSSQLServer\Client\ConnectTo",             # 64 bits
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\MSSQLServer\Client\ConnectTo"  # 32 bits
)

foreach ($ruta in $rutas) {
    if (-not (Test-Path $ruta)) { New-Item -Path $ruta -Force | Out-Null }
    New-ItemProperty -Path $ruta -Name $alias -Value $valor -PropertyType String -Force | Out-Null
    Write-Host "Alias creado en $ruta : $alias -> $valor"
}

Write-Host ""
Write-Host "Pruebe:  sqlcmd -S limon -U sa -C -Q `"SELECT @@SERVERNAME`""
Write-Host "Debe responder: limon"
