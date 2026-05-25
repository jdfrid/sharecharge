# Run as ADMINISTRATOR (required once):
#   PowerShell → Run as administrator
#   cd c:\Users\jdfri\sharecharge\sharecharge
#   .\scripts\open-api-firewall.ps1

$ErrorActionPreference = 'Stop'
$ruleName = 'ShareCharge API 3001'
$nodeRule = 'ShareCharge Node.js API'

Write-Host '=== ShareCharge: allow phone -> PC API (port 3001) ===' -ForegroundColor Cyan

# 1) Wi-Fi as Private (Public blocks most inbound traffic)
$profiles = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' }
foreach ($p in $profiles) {
  if ($p.NetworkCategory -ne 'Private') {
    Write-Host "Setting network '$($p.Name)' to Private (was $($p.NetworkCategory))..."
    Set-NetConnectionProfile -InterfaceIndex $p.InterfaceIndex -NetworkCategory Private
  } else {
    Write-Host "Network '$($p.Name)' is already Private."
  }
}

# 2) Firewall: port 3001 on ALL profiles (including Public if user stays Public)
$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null
if ($LASTEXITCODE -eq 0 -and $existing -notmatch 'No rules match') {
  Write-Host "Updating rule: $ruleName"
  netsh advfirewall firewall delete rule name="$ruleName" | Out-Null
}
netsh advfirewall firewall add rule `
  name="$ruleName" `
  dir=in action=allow protocol=TCP localport=3001 `
  profile=any `
  description="ShareCharge dev API for phone on LAN"

# 3) Allow node.exe (Windows sometimes blocks the app, not just the port)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $nodePath = $nodeCmd.Source
  $existingNode = netsh advfirewall firewall show rule name="$nodeRule" 2>$null
  if ($LASTEXITCODE -ne 0 -or $existingNode -match 'No rules match') {
    netsh advfirewall firewall add rule `
      name="$nodeRule" `
      dir=in action=allow program="$nodePath" `
      profile=any `
      description="Node.js ShareCharge API server"
    Write-Host "Allowed Node.js: $nodePath"
  }
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.PrefixOrigin -ne 'WellKnown'
} | Where-Object { $_.IPAddress -notmatch '^169\.254\.' } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "Done. Start API: npm run start:api" -ForegroundColor Green
Write-Host "From phone browser (same Wi-Fi, NOT mobile data):" -ForegroundColor Yellow
if ($ip) {
  Write-Host "  http://${ip}:3001/api/health"
} else {
  Write-Host "  http://YOUR_PC_IP:3001/api/health"
}
Write-Host ""
Write-Host "If still blocked: router may use AP/client isolation — use USB adb reverse or Render deploy."
