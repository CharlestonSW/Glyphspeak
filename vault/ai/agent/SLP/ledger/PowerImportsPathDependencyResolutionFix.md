═══════════════════════════════════════════════════════════════════
  LEDGER ENTRY: Power Imports Path Dependency Resolution
═══════════════════════════════════════════════════════════════════

📍 Marker: Power Imports Not Working
🔗 Reference: https://internal.storelocatorplus.com/power-imports-are-not-working/
📅 Resolution Date: 2025-11-05
🏷️  Tags: #power #imports #path-dependency #asset-enqueue #javascript

───────────────────────────────────────────────────────────────────
  PROBLEM STATEMENT
───────────────────────────────────────────────────────────────────

Power add-on import functionality fails when plugin installed at 
non-standard path (e.g., slp-power-2 instead of slp-power).

Symptom: JavaScript asset fails to load → Import UI non-functional

───────────────────────────────────────────────────────────────────
  ROOT CAUSE ANALYSIS
───────────────────────────────────────────────────────────────────

Location: SLP_BaseClass_Admin.php:376

$base_name = preg_replace('/\W/', '', dirname($this->addon->slug));

Issue Chain:
  ⟨slug⟩ = 'slp-power-2/slp-power.php'
  ⇨ dirname() = 'slp-power-2'
  ⇨ $base_name = 'slppower2'
  ⇨ Seeks: 'js/slppower2-admin-locations-tab.js'
  ⇨ Actual: 'js/slppower-admin-locations-tab.js'
  ↯ 404 Not Found

Diagnosis: Base name derived from directory path instead of plugin 
identity, breaking when installation path differs from canonical.

───────────────────────────────────────────────────────────────────
  RESOLUTION
───────────────────────────────────────────────────────────────────

✓ Fix 1: Use short_slug instead of directory name
  
  File: SLP_BaseClass_Admin.php:376
  
  BEFORE:
  $base_name = preg_replace('/\W/', '', dirname($this->addon->slug));
  
  AFTER:
  $base_name = preg_replace('/\W/', '', $this->addon->short_slug);
  
  Rationale: short_slug derived from plugin filename, not directory

✓ Fix 2: Standardize asset naming convention
  
  File: wp-content/plugins/slp-power/js/
  
  RENAME: slppower-admin-locations-tab.js
  TO:     admin-locations-tab.js
  
  Rationale: Consistent with base SLP plugin naming

✓ Fix 3: Simplify enqueue array
  
  File: SLP_BaseClass_Admin.php:430-436
  
  BEFORE:
  $files = array(
      'js/admin-locations-tab.min.js',
      'js/admin-locations-tab.js',
      'js/' . $base_name . '-admin-locations-tab.min.js',
      'js/' . $base_name . '-admin-locations-tab.js'
  );
  
  AFTER:
  $files = array(
      'js/admin-locations-tab.min.js',
      'js/admin-locations-tab.js'
  );

───────────────────────────────────────────────────────────────────
  VERIFICATION
───────────────────────────────────────────────────────────────────

Test Environment: Docker QC server
Test Case: Install Power at slp-power-2 directory
Method: Modified docker-compose.yml volume mount

BEFORE FIX:
  - Import UI loads: ❌
  - JS console error: slppower2-admin-locations-tab.js 404
  
AFTER FIX:
  - Import UI loads: ✅
  - JS assets load correctly: ✅
  - Path-independent operation: ✅

───────────────────────────────────────────────────────────────────
  TECHNICAL DETAILS
───────────────────────────────────────────────────────────────────

Affected Components:
  • SLP_BaseClass_Admin::enqueue_admin_javascript()
  • Power add-on JavaScript asset loading
  • All add-ons using base class enqueue pattern

Key Properties:
  • $this->addon->slug       → Full plugin slug (dir/file.php)
  • $this->addon->short_slug → Filename without .php extension
  • $this->addon->dir        → Absolute filesystem path
  • $this->addon->url        → Browser-accessible URL

WordPress Functions:
  • plugin_basename(__FILE__) → Generates slug from actual file
  • plugin_dir_path()         → Always uses actual filesystem
  • plugins_url()             → Always uses actual URL

───────────────────────────────────────────────────────────────────
  IMPACT & BENEFITS
───────────────────────────────────────────────────────────────────

✓ Path Independence: Plugins work regardless of installation directory
✓ Code Simplification: Reduced enqueue array complexity
✓ Naming Consistency: Standardized asset naming across add-ons
✓ Future-Proof: New add-ons follow simpler pattern
✓ Maintainability: Less plugin-specific logic required

───────────────────────────────────────────────────────────────────
  GLYPHSPEAK NOTATION
───────────────────────────────────────────────────────────────────

⟨ΞPowerImports⟩ ≡ ⟨ΨPathDependency⟩ ⊢ ⟨ΔAssetEnqueue⟩

ΩDiagnosis:
  ⟨$base_name⟩ ← dirname(⟨slug⟩) ⇨ ⟨directory_name⟩
  IF ⟨install_path⟩ ≠ ⟨canonical_path⟩ THEN ↯ 404

ΩResolution:
  ⟨$base_name⟩ ← ⟨short_slug⟩ ⊥ ⟨directory_structure⟩
  ∴ ⟨js_file⟩ = 'admin-locations-tab.js' ∀ ⟨install_path⟩

Formula: ⟨short_slug⟩ ⟶ ⟨base_name⟩ ⊥ ⟨directory_structure⟩

───────────────────────────────────────────────────────────────────
  FILES MODIFIED
───────────────────────────────────────────────────────────────────

1. wp-content/plugins/store-locator-plus/include/base/
   SLP_BaseClass_Admin.php
   
   Lines: 376, 430-436
   Changes: 
   - Use short_slug for base_name calculation
   - Simplified manage_locations file array

2. wp-content/plugins/slp-power/js/
   
   RENAMED: slppower-admin-locations-tab.js
   TO:      admin-locations-tab.js

───────────────────────────────────────────────────────────────────
  RELATED ISSUES
───────────────────────────────────────────────────────────────────

• MapMarkersNotSaving: Context mismatch in settings vs locations
• EditLocationMarkerImageSync: Vue reactivity for marker display

Pattern: Path/naming consistency critical for hybrid PHP/JS systems

═══════════════════════════════════════════════════════════════════
  END LEDGER ENTRY
═══════════════════════════════════════════════════════════════════
