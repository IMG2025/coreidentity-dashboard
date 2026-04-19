#!/usr/bin/env python3
"""
script_47_ui_clickability_fixes.py
Five idempotent transforms targeting UI agent test failures:
  1. Sentinel tab buttons — add data-testid so test agent can find/click tabs
  2. Sentinel + Governance FrameworkCard button — add aria-label for reliable clicking
  3. TenantDashboard company card — add role=button + tabIndex so Playwright can click
  4. IdentityGovernance AgentCard — auto-expand first card so EXECUTE/ANALYZE buttons are in DOM
  5. SettingsPage — replace Promise.race with explicit AbortController fetch to /api/auth/profile
Ends with npm run build.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC  = ROOT / 'src'


# ─────────────────────────────────────────────────────────────────────────────
# 1. Sentinel.jsx — add data-testid to tab buttons
# ─────────────────────────────────────────────────────────────────────────────

SENTINEL_TAB_SENTINEL = "data-testid={'tab-' + t}"

SENTINEL_TAB_OLD = (
    "            <button key={t} onClick={function() { setTab(t); }}\n"
    "              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900')}>"
)

SENTINEL_TAB_NEW = (
    "            <button key={t} onClick={function() { setTab(t); }} data-testid={'tab-' + t}\n"
    "              className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (tab === t ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900')}>"
)


def fix_sentinel_tabs():
    path = SRC / 'pages' / 'Sentinel.jsx'
    text = path.read_text()
    if SENTINEL_TAB_SENTINEL in text:
        print('[sentinel-tabs] data-testid already present — skip')
        return
    if SENTINEL_TAB_OLD not in text:
        print('[sentinel-tabs] WARN: tab button anchor not found — skip', file=sys.stderr)
        return
    path.write_text(text.replace(SENTINEL_TAB_OLD, SENTINEL_TAB_NEW, 1))
    print('[sentinel-tabs] data-testid added to tab buttons')


# ─────────────────────────────────────────────────────────────────────────────
# 2a. Sentinel.jsx FrameworkCard — add aria-label to expand button
# ─────────────────────────────────────────────────────────────────────────────

SENTINEL_FW_SENTINEL = "aria-label={'Expand ' + fw.name}"

SENTINEL_FW_OLD = (
    "      <button onClick={function() { setExpanded(function(p) { return !p; }); }}\n"
    "        className='w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left'>"
)

SENTINEL_FW_NEW = (
    "      <button onClick={function() { setExpanded(function(p) { return !p; }); }} aria-label={'Expand ' + fw.name}\n"
    "        className='w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left'>"
)


def fix_sentinel_framework_expand():
    path = SRC / 'pages' / 'Sentinel.jsx'
    text = path.read_text()
    if SENTINEL_FW_SENTINEL in text:
        print('[sentinel-fw-expand] aria-label already present — skip')
        return
    if SENTINEL_FW_OLD not in text:
        print('[sentinel-fw-expand] WARN: FrameworkCard button anchor not found — skip', file=sys.stderr)
        return
    path.write_text(text.replace(SENTINEL_FW_OLD, SENTINEL_FW_NEW, 1))
    print('[sentinel-fw-expand] aria-label added to FrameworkCard expand button')


# ─────────────────────────────────────────────────────────────────────────────
# 2b. Governance.jsx FrameworkCard — add aria-label to expand button
# ─────────────────────────────────────────────────────────────────────────────

GOVERNANCE_FW_SENTINEL = "aria-label={'Expand ' + name}"

GOVERNANCE_FW_OLD = (
    "      <button onClick={function() { setExpanded(function(p) { return !p; }); }}\n"
    "        className='w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left'>"
)

GOVERNANCE_FW_NEW = (
    "      <button onClick={function() { setExpanded(function(p) { return !p; }); }} aria-label={'Expand ' + name}\n"
    "        className='w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left'>"
)


def fix_governance_framework_expand():
    path = SRC / 'pages' / 'Governance.jsx'
    text = path.read_text()
    if GOVERNANCE_FW_SENTINEL in text:
        print('[governance-fw-expand] aria-label already present — skip')
        return
    if GOVERNANCE_FW_OLD not in text:
        print('[governance-fw-expand] WARN: FrameworkCard button anchor not found — skip', file=sys.stderr)
        return
    path.write_text(text.replace(GOVERNANCE_FW_OLD, GOVERNANCE_FW_NEW, 1))
    print('[governance-fw-expand] aria-label added to FrameworkCard expand button')


# ─────────────────────────────────────────────────────────────────────────────
# 3. TenantDashboard.jsx — add role=button + tabIndex to company card div
# ─────────────────────────────────────────────────────────────────────────────

TENANT_CARD_SENTINEL = 'TENANT_COMPANY_CARD_ROLE_BUTTON'

TENANT_CARD_OLD = (
    "              <div\n"
    "                key={co.clientId}\n"
    "                onClick={() => setSelectedTenant(co.clientId)}\n"
    "                style={{\n"
    "                  background: C.surface,\n"
    "                  border: '1px solid ' + C.border,\n"
    "                  borderRadius: 6,\n"
    "                  padding: '16px',\n"
    "                  cursor: 'pointer',\n"
    "                  transition: 'all 0.15s',\n"
    "                }}"
)

TENANT_CARD_NEW = (
    "              <div\n"
    "                key={co.clientId}\n"
    "                role=\"button\" /* TENANT_COMPANY_CARD_ROLE_BUTTON */\n"
    "                tabIndex={0}\n"
    "                onKeyDown={function(e) { if (e.key === 'Enter' || e.key === ' ') setSelectedTenant(co.clientId); }}\n"
    "                onClick={() => setSelectedTenant(co.clientId)}\n"
    "                style={{\n"
    "                  background: C.surface,\n"
    "                  border: '1px solid ' + C.border,\n"
    "                  borderRadius: 6,\n"
    "                  padding: '16px',\n"
    "                  cursor: 'pointer',\n"
    "                  transition: 'all 0.15s',\n"
    "                }}"
)


def fix_tenant_company_card():
    path = SRC / 'pages' / 'TenantDashboard.jsx'
    text = path.read_text()
    if TENANT_CARD_SENTINEL in text:
        print('[tenant-card] role=button already present — skip')
        return
    if TENANT_CARD_OLD not in text:
        print('[tenant-card] WARN: company card div anchor not found — skip', file=sys.stderr)
        return
    path.write_text(text.replace(TENANT_CARD_OLD, TENANT_CARD_NEW, 1))
    print('[tenant-card] role=button + tabIndex added to company card div')


# ─────────────────────────────────────────────────────────────────────────────
# 4. IdentityGovernance.jsx — auto-expand first AgentCard so buttons are in DOM
# ─────────────────────────────────────────────────────────────────────────────

IG_EXPAND_SENTINEL = '// IG_DEFAULT_EXPANDED_FIX'

IG_SIGNATURE_OLD = 'function AgentCard({ agent, token }) {'
IG_SIGNATURE_NEW = 'function AgentCard({ agent, token, defaultExpanded }) { // IG_DEFAULT_EXPANDED_FIX'

IG_STATE_OLD = '  const [expanded, setExpanded] = useState(false);'
IG_STATE_NEW = '  const [expanded, setExpanded] = useState(defaultExpanded || false);'

IG_MAP_OLD = '        filtered.map(a => <AgentCard key={a.agentId} agent={a} token={token} />)'
IG_MAP_NEW = '        filtered.map((a, i) => <AgentCard key={a.agentId} agent={a} token={token} defaultExpanded={i === 0} />)'


def fix_identity_governance_buttons():
    path = SRC / 'pages' / 'IdentityGovernance.jsx'
    text = path.read_text()
    if IG_EXPAND_SENTINEL in text:
        print('[ig-buttons] defaultExpanded already present — skip')
        return
    missing = []
    if IG_SIGNATURE_OLD not in text: missing.append('AgentCard signature')
    if IG_STATE_OLD not in text:     missing.append('expanded useState')
    if IG_MAP_OLD not in text:       missing.append('filtered.map call')
    if missing:
        print('[ig-buttons] WARN: anchors not found (' + ', '.join(missing) + ') — skip', file=sys.stderr)
        return
    text = text.replace(IG_SIGNATURE_OLD, IG_SIGNATURE_NEW, 1)
    text = text.replace(IG_STATE_OLD, IG_STATE_NEW, 1)
    text = text.replace(IG_MAP_OLD, IG_MAP_NEW, 1)
    path.write_text(text)
    print('[ig-buttons] AgentCard auto-expands first card; EXECUTE/ANALYZE buttons now in DOM on load')


# ─────────────────────────────────────────────────────────────────────────────
# 5. SettingsPage.jsx — replace Promise.race with AbortController profile fetch
# ─────────────────────────────────────────────────────────────────────────────

SETTINGS_SENTINEL_NEW = 'FIX10_PROFILE_ABORT'
SETTINGS_SENTINEL_OLD = 'FIX07_PROFILE_TIMEOUT'

SETTINGS_OLD = (
    "  // FIX07_PROFILE_TIMEOUT: Promise.race ensures profile fetch settles within 5s\n"
    "  React.useEffect(() => {\n"
    "    if (!api.getProfile) return;\n"
    "    const timeout = new Promise(function(_, reject) {\n"
    "      setTimeout(function() { reject(new Error('profile-timeout')); }, 5000);\n"
    "    });\n"
    "    Promise.race([api.getProfile(), timeout])\n"
    "      .then(function(p) { setProfile(p?.data || p); })\n"
    "      .catch(function() {});\n"
    "  }, []);"
)

SETTINGS_NEW = (
    "  // FIX10_PROFILE_ABORT: explicit /api/auth/profile fetch with AbortController\n"
    "  React.useEffect(() => {\n"
    "    const _ctrl = new AbortController();\n"
    "    const _timer = setTimeout(function() { _ctrl.abort(); }, 8000);\n"
    "    fetch('https://api.coreidentitygroup.com/api/auth/profile', {\n"
    "      headers: { Authorization: 'Bearer ' + (localStorage.getItem('ci_token') || localStorage.getItem('token') || '') },\n"
    "      signal: _ctrl.signal,\n"
    "    })\n"
    "      .then(function(r) { return r.ok ? r.json() : null; })\n"
    "      .then(function(d) { if (d) setProfile(d.data || d); })\n"
    "      .catch(function() {})\n"
    "      .finally(function() { clearTimeout(_timer); });\n"
    "    return function() { _ctrl.abort(); clearTimeout(_timer); };\n"
    "  }, []);"
)


def fix_settings_profile():
    path = SRC / 'pages' / 'SettingsPage.jsx'
    text = path.read_text()
    if SETTINGS_SENTINEL_NEW in text:
        print('[settings-profile] AbortController fetch already present — skip')
        return
    if SETTINGS_OLD not in text:
        if SETTINGS_SENTINEL_OLD in text:
            print('[settings-profile] WARN: FIX07 block found but exact text differs — skip', file=sys.stderr)
        else:
            print('[settings-profile] WARN: profile useEffect anchor not found — skip', file=sys.stderr)
        return
    path.write_text(text.replace(SETTINGS_OLD, SETTINGS_NEW, 1))
    print('[settings-profile] AbortController fetch to /api/auth/profile installed')


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main():
    fix_sentinel_tabs()
    fix_sentinel_framework_expand()
    fix_governance_framework_expand()
    fix_tenant_company_card()
    fix_identity_governance_buttons()
    fix_settings_profile()

    print('\n[build] running npm run build...')
    result = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, capture_output=False)
    sys.exit(result.returncode)


if __name__ == '__main__':
    main()
