import sqlite3
from pathlib import Path

ROOT=Path(__file__).resolve().parent
sql1=(ROOT/'migrations'/'0001_operational_core.sql').read_text(encoding='utf-8')
sql2=(ROOT/'migrations'/'0002_user_delivery.sql').read_text(encoding='utf-8')
db=sqlite3.connect(':memory:')
db.executescript(sql1)
db.executescript(sql2)

tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required={
    'sos_accounts','sos_trusted_contacts','sos_contact_invites',
    'sos_due_windows','sos_checkins','sos_outbox','sos_user_channels','sos_schema_state'
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
        "INSERT INTO sos_accounts(account_ref,timezone,checkin_local_time,cadence_hours,grace_minutes,status) VALUES(?,?,?,?,?,?)",
        ('sua_'+'d'*36,'Europe/Lisbon','20:00',12,60,'setup')
    )
    raise AssertionError('MVP cadence must remain daily')
except sqlite3.IntegrityError:
    pass

try:
    db.execute(
        "INSERT INTO sos_accounts(account_ref,timezone,checkin_local_time,cadence_hours,grace_minutes,status) VALUES(?,?,?,?,?,?)",
        ('sua_'+'1'*36,'Europe/Lisbon','25:00',24,60,'setup')
    )
    raise AssertionError('invalid local check-in time must be rejected')
except sqlite3.IntegrityError:
    pass

db.execute(
    """INSERT INTO sos_user_channels(
       channel_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv,
       verification_source,verified_at
       ) VALUES(?,?,?,?,?,?,?)""",
    ('suc_'+'e'*36,'sua_'+'a'*36,'email','ciphertext-value-long','iv-value-long',
     'auth_provider','2026-09-25T10:00:00Z')
)
try:
    db.execute(
        """INSERT INTO sos_user_channels(
           channel_ref,account_ref,endpoint_kind,endpoint_ciphertext,endpoint_iv,
           verification_source,verified_at
           ) VALUES(?,?,?,?,?,?,?)""",
        ('suc_'+'f'*36,'sua_'+'a'*36,'email','ciphertext-value-long','iv-value-long',
         'auth_provider','2026-09-25T10:00:00Z')
    )
    raise AssertionError('second live user reminder channel must be rejected')
except sqlite3.IntegrityError:
    pass

version=db.execute(
    "SELECT schema_value FROM sos_schema_state WHERE schema_key='sos_operational_schema_version'"
).fetchone()[0]
assert version=='SOS.OP.2'
print('SOS operational schema: OK')
