$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$postsFile = Join-Path $scriptRoot '..\data\posts.json' | Resolve-Path -ErrorAction Stop
$imagesDir = Join-Path $scriptRoot '..\assets\images' | Resolve-Path -ErrorAction Stop

if (-not (Test-Path $postsFile)) { Write-Error "posts.json not found at $postsFile"; exit 1 }

$posts = Get-Content $postsFile -Raw | ConvertFrom-Json
$images = Get-ChildItem -Path $imagesDir -File | Where-Object { $_.Extension -match 'png|jpg|jpeg|svg|webp' } | Select-Object -ExpandProperty Name
if ($images.Count -eq 0) { Write-Error "No images found in $imagesDir"; exit 1 }

$used = [System.Collections.Generic.HashSet[string]]::new()
$imagesLower = $images | ForEach-Object { $_.ToLower() }

# Keep valid existing
foreach ($p in $posts) {
  if ($p.image) {
    $candidatePath = Join-Path $scriptRoot "..\$($p.image)"
    if (Test-Path $candidatePath) { $used.Add([System.IO.Path]::GetFileName($p.image).ToLower()) | Out-Null }
  }
}

# Assign missing
foreach ($p in $posts) {
  $current = if ($p.image) { [System.IO.Path]::GetFileName($p.image).ToLower() } else { '' }
  $valid = $false
  if ($current) {
    $check = Join-Path $scriptRoot "..\assets\images\$current"
    if (Test-Path $check) { $valid = $true }
  }
  if ($valid) { continue }

  $id = $p.id.ToLower()
  $found = $images | Where-Object { $_.ToLower().Contains($id) -and (-not $used.Contains($_.ToLower())) } | Select-Object -First 1
  if (-not $found) {
    $words = ($p.title.ToLower() -split '[^a-z0-9\-]') | Where-Object { $_ }
    foreach ($w in $words) {
      $found = $images | Where-Object { $_.ToLower().Contains($w) -and (-not $used.Contains($_.ToLower())) } | Select-Object -First 1
      if ($found) { break }
    }
  }
  if (-not $found) {
    $found = $images | Where-Object { -not $used.Contains($_.ToLower()) } | Select-Object -First 1
  }
  if ($found) {
    $used.Add($found.ToLower()) | Out-Null
    $p.image = "assets/images/$found"
    Write-Host "Assigned $found → $($p.id)"
  } else {
    Write-Warning "No available image to assign for $($p.id)"
  }
}

# Save back
$posts | ConvertTo-Json -Depth 10 | Set-Content $postsFile -Encoding UTF8
Write-Host "Updated $postsFile"