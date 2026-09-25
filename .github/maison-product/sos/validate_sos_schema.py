import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sql=(ROOT/'migrations'/'0001_operational_core.sql').read_text(encoding='utf-8')
db=sqlite3.connect(':memory:')
db.executescript(sql)

tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required={
    'sos_accounts','sos_trusted_contacts','sos_contact_invites',
    'sos_due_windows','sos_checkins','sos_outbox','sos_schema_state'
}
assert required <= tables, required-tables

db.execute(
    "INSERT INTO sos_accounts(account_ref,timezone,cadence_hours,grace_minutes,status) VALUES(?,?,?,?,?)",
    ('sua_'+'a'*36,'Europe/Lisbon',24,60,'setup')
)
db.execute(
    """INSERT INTO sos_trusted_contacts(
       contact_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv
       ) VALUES(?,?,?,?,?)""",
    ('sct_'+'b'*36,'sua_'+'a'*36,'email','ciphertext-value-long','iv-value-long')
)

try:
    db.execute(
        """INSERT INTO sos_trusted_contacts(
           contact_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv
           ) VALUES(?,?,?,?,?)""",
        ('sct_'+'c'*36,'sua_'+'a'*36,'email','ciphertext-value-long','iv-value-long')
    )
    raise AssertionError('second live trusted contact must be rejected')
except sqlite3.IntegrityError:
    pass

try:
    db.execute(
        "INSERT INTO sos_accounts(account_ref,timezone,cadence_hours,grace_minutes,status) VALUES(?,?,?,?,?)",
        ('sua_'+'d'*36,'Europe/Lisbon',12,60,'setup')
    )
    raise AssertionError('MVP cadence must remain daily')
except sqlite3.IntegrityError:
    pass

version=db.execute(
    "SELECT schema_value FROM sos_schema_state WHERE schema_key='sos_operational_schema_version'"
).fetchone()[0]
assert version=='SOS.OP.1'
print('SOS operational schema: OK')
