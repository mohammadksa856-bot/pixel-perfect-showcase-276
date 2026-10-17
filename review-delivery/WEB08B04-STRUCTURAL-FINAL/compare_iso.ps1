$ErrorActionPreference = 'Stop'
$reviewRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $reviewRoot
$sourceUrl = 'https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml'
$sourceResponse = Invoke-WebRequest -Uri $sourceUrl
[xml]$sourceXml = $sourceResponse.Content
$officialCodes = @($sourceXml.ISO_4217.CcyTbl.CcyNtry | ForEach-Object { [string]$_.Ccy } | Where-Object { $_ } | Sort-Object -Unique)
$implementationText = Get-Content -Raw -LiteralPath (Join-Path $repositoryRoot 'research-evidence/aramco-research-pack/iso4217.ts')
$arrayBody = [regex]::Match($implementationText, '(?s)export const ISO4217_CODES[^=]*=\s*\[(.*?)\];').Groups[1].Value
if (-not $arrayBody) { throw 'Unable to locate ISO4217_CODES array' }
$implementationRaw = @([regex]::Matches($arrayBody, '"([A-Z]{3})"') | ForEach-Object { $_.Groups[1].Value })
$implementationCodes = @($implementationRaw | Sort-Object -Unique)
$missing = @($officialCodes | Where-Object { $_ -cnotin $implementationCodes })
$extra = @($implementationCodes | Where-Object { $_ -cnotin $officialCodes })
[ordered]@{
  application_sha='8e896378a763f7cb5632ec5bb2963e5313664301'
  tested_delivery_sha='c737e9bf76ebe55c0c8bbff15ce87732b987e449'
  source_url=$sourceUrl
  fetched_at_utc=[DateTime]::UtcNow.ToString('o')
  published=[string]$sourceXml.ISO_4217.Pblshd
  response_content_utf8_sha256=[Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($sourceResponse.Content))).ToLower()
  official_unique_count=$officialCodes.Count
  implementation_count=$implementationRaw.Count
  implementation_unique_count=$implementationCodes.Count
  missing=$missing
  extra=$extra
  equal=($missing.Count -eq 0 -and $extra.Count -eq 0 -and $implementationRaw.Count -eq $implementationCodes.Count)
  compared='All unique alphabetic Ccy entries against every literal ISO4217_CODES entry; ordinal case-sensitive membership, no count-only inference.'
  original_xml_saved=$false
} | ConvertTo-Json -Depth 5
