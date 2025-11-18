# Database Backup Scripts

## Quick Start

### Backup Now
```powershell
.\scripts\backup.ps1
```

### Restore from Backup
```powershell
.\scripts\restore.ps1
```

### Setup Auto Backup
See: [docs/BACKUP_RESTORE_GUIDE.md](../docs/BACKUP_RESTORE_GUIDE.md)

---

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `backup.ps1` | Manual backup | `.\scripts\backup.ps1` |
| `restore.ps1` | Restore from backup | `.\scripts\restore.ps1` |
| `backup-auto.ps1` | Automated backup (Task Scheduler) | Scheduled task |

---

## Current Backup Status

**Last backup:** Check `backups/` folder

```powershell
Get-ChildItem backups -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

**Total backups:**
```powershell
(Get-ChildItem backups -Filter "*.sql").Count
```

**Total size:**
```powershell
$size = (Get-ChildItem backups -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "$([math]::Round($size/1MB, 2)) MB"
```

---

## Documentation

Full documentation: [docs/BACKUP_RESTORE_GUIDE.md](../docs/BACKUP_RESTORE_GUIDE.md)
