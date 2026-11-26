# ---------------------------------------------------------------------------
# Guarda el informe de fletes semanal (CSV) en una carpeta de red.
#
# Corre en un servidor o PC de la oficina con Windows que vea la carpeta. Pide
# el CSV a la funcion enviar-informe-fletes de produccion (modo descarga: no
# manda correo) y lo deja como Informe_fletes_AAAA-MM-DD_a_AAAA-MM-DD.csv.
#
# Revisa las ultimas $SemanasAtras semanas y baja las que falten: si el equipo
# estaba apagado el lunes, la semana se guarda la proxima vez que corra.
# Una semana ya guardada no se vuelve a bajar.
#
# Instalacion (una vez):
#   1. Copiar este archivo a una carpeta del servidor, por ejemplo C:\QTracking.
#   2. En esa misma carpeta crear informe-fletes.secreto con una sola linea: el
#      valor de INFORME_FLETES_DESCARGA_SECRET de la funcion en produccion.
#   3. Cambiar $Carpeta abajo.
#   4. Programarlo (PowerShell como administrador; cambiar el usuario por una
#      cuenta que pueda escribir en la carpeta de red):
#        $accion  = New-ScheduledTaskAction -Execute "powershell.exe" `
#                   -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\QTracking\guardar-informe-fletes.ps1"'
#        $lunes   = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6:15am
#        $inicio  = New-ScheduledTaskTrigger -AtStartup
#        Register-ScheduledTask -TaskName "QTracking informe de fletes" -Action $accion `
#          -Trigger $lunes, $inicio -User "DOMINIO\usuario" -Password "..." -RunLevel Limited
#   5. Probarlo: Start-ScheduledTask -TaskName "QTracking informe de fletes"
#      y revisar la carpeta y informe-fletes.log.
# ---------------------------------------------------------------------------

# Carpeta de red donde quedan los informes. Va con la ruta de red
# (\\servidor\recurso\...), no con la letra de unidad: S: y las demas unidades
# mapeadas no existen para una tarea programada. La ruta de red de S: sale con
# (Get-PSDrive S).DisplayRoot. Este archivo va en UTF-8 con BOM para que
# PowerShell 5.1 lea bien las tildes de la ruta.
$Carpeta = "\\SERVIDOR\RECURSO\Z. Logística\_QPrex Logistica\Tracking Pedidos"
$SemanasAtras = 4
$Url = "https://cfvvnvmezmrxehpaqayw.supabase.co/functions/v1/enviar-informe-fletes"

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$Log = Join-Path $Aqui "informe-fletes.log"
function Escribir-Log($texto) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $texto" | Out-File -FilePath $Log -Append -Encoding utf8
}

try {
  $secreto = (Get-Content -Path (Join-Path $Aqui "informe-fletes.secreto") -TotalCount 1).Trim()
  if (-not $secreto) { throw "informe-fletes.secreto esta vacio" }
  if (-not (Test-Path -LiteralPath $Carpeta)) { throw "No se encuentra la carpeta $Carpeta" }

  # Lunes de esta semana; cada semana va de lunes a domingo.
  $hoy = (Get-Date).Date
  $lunesEsta = $hoy.AddDays(-(([int]$hoy.DayOfWeek + 6) % 7))

  for ($i = $SemanasAtras; $i -ge 1; $i--) {
    $desde = $lunesEsta.AddDays(-7 * $i).ToString("yyyy-MM-dd")
    $hasta = $lunesEsta.AddDays(-7 * $i + 6).ToString("yyyy-MM-dd")
    $nombre = "Informe_fletes_${desde}_a_${hasta}.csv"
    $destino = Join-Path $Carpeta $nombre
    if (Test-Path -LiteralPath $destino) { continue }

    # Se baja a un temporal y se mueve al final: en la carpeta nunca queda un
    # archivo a medias.
    $temporal = Join-Path $env:TEMP $nombre
    Invoke-WebRequest -Method Post -Uri $Url -UseBasicParsing -OutFile $temporal `
      -Headers @{ "x-informe-descarga" = $secreto } -ContentType "application/json" `
      -Body (@{ desde = $desde; hasta = $hasta } | ConvertTo-Json -Compress)
    Move-Item -LiteralPath $temporal -Destination $destino -Force
    Escribir-Log "Guardado $nombre"
  }
} catch {
  Escribir-Log "ERROR: $($_.Exception.Message)"
  exit 1
}
