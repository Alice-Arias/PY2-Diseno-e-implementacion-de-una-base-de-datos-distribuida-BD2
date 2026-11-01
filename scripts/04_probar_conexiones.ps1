# ---------------------------------------------------------------------------------------
# SCRIPT: 04_probar_conexiones.ps1
# DÓNDE: Windows (laptop A), en PowerShell normal.
# OBJETIVO: probar las 5 conexiones que necesita el sistema distribuido.
#
# Complete las variables de abajo. Las contraseñas se piden al ejecutar (no se guardan).
# ---------------------------------------------------------------------------------------

$azureServidor = "NOMBRE-DEL-SERVIDOR.database.windows.net"   # <- cambiar
$azureBase     = "WWI_Corporativo"
$azureUsuario  = "admin_corporativo"                           # <- cambiar

$saSanJose = Read-Host "Contraseña de sa en SAN JOSE"
$saLimon   = Read-Host "Contraseña de sa en LIMON"
$pwAzure   = Read-Host "Contraseña de $azureUsuario en AZURE"

function Probar($titulo, [scriptblock]$comando) {
    Write-Host -NoNewline ("{0,-40}" -f $titulo)
    $salida = (& $comando 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -eq 0) { Write-Host "OK  $salida" -ForegroundColor Green }
    else { Write-Host "FALLA" -ForegroundColor Red; Write-Host $salida }
}

$q = "SET NOCOUNT ON; SELECT @@SERVERNAME"

Probar "1. Windows -> San Jose"            { sqlcmd -S localhost -U sa -P $saSanJose -C -h -1 -W -Q $q }
Probar "2. Windows -> Limon (por alias)"   { sqlcmd -S limon -U sa -P $saLimon -C -h -1 -W -Q $q }
Probar "3. Windows -> Azure"               { sqlcmd -S $azureServidor -d $azureBase -U $azureUsuario -P $pwAzure -h -1 -W -Q $q }
Probar "4. Limon (contenedor) -> Azure"    { docker exec limon /opt/mssql-tools18/bin/sqlcmd -S $azureServidor -d $azureBase -U $azureUsuario -P $pwAzure -h -1 -W -Q $q }
Probar "5. Limon (contenedor) -> San Jose" { docker exec limon /opt/mssql-tools18/bin/sqlcmd -S "host.docker.internal,1433" -U sa -P $saSanJose -C -h -1 -W -Q $q }

Write-Host ""
Write-Host "Si la 3 o la 4 fallan: agregue su IP en Azure > Servidor SQL > Redes > Reglas de firewall."
Write-Host "Si la 5 falla: en Windows abra el puerto 1433 en el Firewall y active TCP/IP en SQL Server Configuration Manager."
