# MH Wilds Data Fetcher
# Fetches ALL data from the MH Wilds API and saves as local JSON files
# Run once, then the app uses local data only

$baseUrl = "https://wilds.mhdb.io/en"
$dataDir = "$PSScriptRoot\data"

# Create data directory
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

$endpoints = @(
    @{ Name = "armor";       Url = "$baseUrl/armor" },
    @{ Name = "armor-sets";  Url = "$baseUrl/armor/sets" },
    @{ Name = "skills";      Url = "$baseUrl/skills" },
    @{ Name = "decorations"; Url = "$baseUrl/decorations" },
    @{ Name = "charms";      Url = "$baseUrl/charms" },
    @{ Name = "weapons";     Url = "$baseUrl/weapons" },
    @{ Name = "items";       Url = "$baseUrl/items" },
    @{ Name = "ailments";    Url = "$baseUrl/ailments" },
    @{ Name = "monsters";    Url = "$baseUrl/monsters" },
    @{ Name = "locations";   Url = "$baseUrl/locations" }
)

$totalEndpoints = $endpoints.Count
$current = 0

foreach ($ep in $endpoints) {
    $current++
    $outFile = "$dataDir\$($ep.Name).json"
    
    Write-Host "[$current/$totalEndpoints] Fetching $($ep.Name)..." -NoNewline
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        # Use Invoke-WebRequest for raw JSON (Invoke-RestMethod deserializes which loses formatting)
        $response = Invoke-WebRequest -Uri $ep.Url -UseBasicParsing
        $json = $response.Content
        
        $stopwatch.Stop()
        
        # Pretty-print the JSON for readability
        $parsed = $json | ConvertFrom-Json
        $count = if ($parsed -is [array]) { $parsed.Count } else { 1 }
        $prettyJson = $parsed | ConvertTo-Json -Depth 20 -Compress:$false
        
        # Save to file (UTF8 without BOM)
        [System.IO.File]::WriteAllText($outFile, $prettyJson, [System.Text.UTF8Encoding]::new($false))
        
        $sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
        Write-Host " OK! ($count items, ${sizeMB}MB, $([math]::Round($stopwatch.Elapsed.TotalSeconds, 1))s)" -ForegroundColor Green
    }
    catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== Data Collection Complete ===" -ForegroundColor Cyan
Write-Host "Files saved to: $dataDir"
$totalSize = (Get-ChildItem $dataDir -Filter "*.json" | Measure-Object -Property Length -Sum).Sum
Write-Host "Total size: $([math]::Round($totalSize / 1MB, 2)) MB"
Write-Host ""
Get-ChildItem $dataDir -Filter "*.json" | ForEach-Object {
    $count = ($_ | Get-Content -Raw | ConvertFrom-Json).Count
    Write-Host "  $($_.Name): $([math]::Round($_.Length / 1MB, 2)) MB ($count items)"
}
