import os
import json
import time
import hashlib
from flask import Blueprint, jsonify, request
from database.db_manager import get_db

legal_bp = Blueprint("legal_service", __name__)
bp = legal_bp

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LEGAL_JSON_FILE = os.path.join(BASE_DIR, "data_json", "4_dieu_khoan_phap_ly.json")


def ensure_legal_notification_table():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS legal_clauses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            audience TEXT DEFAULT 'all',
            version INTEGER DEFAULT 1,
            effective_date TEXT DEFAULT '2026-11-10',
            change_note TEXT DEFAULT '',
            sop_reference TEXT DEFAULT 'SOP-GENERAL',
            source_file TEXT DEFAULT 'data_json/4_dieu_khoan_phap_ly.json',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    for col_def in [
        "audience TEXT DEFAULT 'all'",
        "version INTEGER DEFAULT 1",
        "effective_date TEXT DEFAULT '2026-11-10'",
        "change_note TEXT DEFAULT ''",
        "sop_reference TEXT DEFAULT 'SOP-GENERAL'",
        "source_file TEXT DEFAULT 'data_json/4_dieu_khoan_phap_ly.json'",
        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
    ]:
        try:
            cursor.execute(f"ALTER TABLE legal_clauses ADD COLUMN {col_def}")
        except Exception:
            pass

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS legal_clause_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clause_id INTEGER,
            article_code TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            title TEXT,
            content TEXT,
            audience TEXT DEFAULT 'all',
            change_note TEXT DEFAULT '',
            edited_by TEXT DEFAULT 'Admin',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS legal_user_acceptances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT,
            role TEXT DEFAULT 'buyer',
            clauses_version_hash TEXT,
            accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            notif_type TEXT DEFAULT 'legal_update',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            product_id INTEGER DEFAULT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS legal_email_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_code TEXT,
            recipient_email TEXT,
            audience TEXT,
            delivery_mode TEXT,
            status TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=False):
    """
    Đảm bảo 100% Điều khoản được đồng bộ hai chiều giữa tệp JSON (data_json/4_dieu_khoan_phap_ly.json)
    và bảng SQLite (legal_clauses + legal_clause_history), không dùng mảng mẫu tĩnh trong code.
    """
    ensure_legal_notification_table()
    os.makedirs(os.path.dirname(LEGAL_JSON_FILE), exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM legal_clauses ORDER BY article_code ASC, id ASC")
    db_rows = [dict(r) for r in cursor.fetchall()]

    json_clauses = []
    if os.path.isfile(LEGAL_JSON_FILE):
        try:
            with open(LEGAL_JSON_FILE, "r", encoding="utf-8") as jf:
                parsed = json.load(jf)
            json_clauses = parsed if isinstance(parsed, list) else (parsed.get("clauses") or parsed.get("items") or [])
        except Exception:
            json_clauses = []

    # Nếu tệp JSON đã có dữ liệu và (DB đang trống hoặc yêu cầu nạp lại từ JSON)
    if json_clauses and (not db_rows or force_reload_from_json):
        for item in json_clauses:
            if not isinstance(item, dict):
                continue
            code = str(item.get("article_code") or item.get("code") or "").strip().upper()
            title = str(item.get("title") or "").strip()
            content = str(item.get("content") or item.get("description") or "").strip()
            if not code or not title:
                continue
            aud = str(item.get("audience") or "all").strip().lower()
            ver = int(item.get("version") or 1)
            eff = str(item.get("effective_date") or "2026-11-10")[:10]
            note = str(item.get("change_note") or "Đồng bộ từ tệp JSON hệ thống").strip()
            sop = str(item.get("sop_reference") or f"SOP-{code}").strip()

            cursor.execute("SELECT id, version FROM legal_clauses WHERE UPPER(article_code) = ?", (code,))
            ex = cursor.fetchone()
            if ex:
                cursor.execute(
                    """
                    UPDATE legal_clauses
                    SET title = ?, content = ?, audience = ?, version = ?, effective_date = ?,
                        change_note = ?, sop_reference = ?, source_file = 'data_json/4_dieu_khoan_phap_ly.json',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (title, content, aud, ver, eff, note, sop, ex[0])
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO legal_clauses (
                        article_code, title, content, audience, version, effective_date,
                        change_note, sop_reference, source_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'data_json/4_dieu_khoan_phap_ly.json')
                    """,
                    (code, title, content, aud, ver, eff, note, sop)
                )
                cid = cursor.lastrowid
                cursor.execute(
                    """
                    INSERT INTO legal_clause_history (clause_id, article_code, version, title, content, audience, change_note, edited_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'JSON Auto-Sync')
                    """,
                    (cid, code, ver, title, content, aud, note)
                )
        conn.commit()
        cursor.execute("SELECT * FROM legal_clauses ORDER BY article_code ASC, id ASC")
        db_rows = [dict(r) for r in cursor.fetchall()]

    # Ghi ngược trạng thái mới nhất từ SQLite ra tệp JSON để tệp JSON luôn đầy đủ 100%
    if db_rows:
        try:
            export_list = []
            for r in db_rows:
                export_list.append({
                    "id": r.get("id"),
                    "article_code": r.get("article_code"),
                    "title": r.get("title"),
                    "content": r.get("content"),
                    "audience": r.get("audience") or "all",
                    "version": int(r.get("version") or 1),
                    "effective_date": r.get("effective_date") or "2026-11-10",
                    "change_note": r.get("change_note") or "",
                    "sop_reference": r.get("sop_reference") or "SOP-GENERAL",
                    "updated_at": str(r.get("updated_at") or "")
                })
            with open(LEGAL_JSON_FILE, "w", encoding="utf-8") as wf:
                json.dump(export_list, wf, ensure_ascii=False, indent=2)
        except Exception:
            pass

    conn.close()
    return db_rows


def send_transactional_email_v2(recipient_email, subject, html_body, plain_text_body="", tag_ref="NVX-MAIL"):
    import uuid
    import smtplib
    import urllib.request
    import urllib.error
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from services.admin_dispute.api import load_env_and_ai_pool

    pool = load_env_and_ai_pool()
    env_map = pool["env_map"]
    db_cfg = pool["db_cfg"]

    resend_key = (env_map.get("RESEND_API_KEY") or db_cfg.get("resend_api_key") or "").strip()
    from_addr = (env_map.get("RESEND_FROM_EMAIL") or db_cfg.get("resend_from_email") or "NVIDIA Store CSKH <noreply@nvidia.castle-tech.cloud>").strip()
    reply_to = (env_map.get("RESEND_REPLY_TO") or db_cfg.get("resend_reply_to") or "cskh@nvidia.castle-tech.cloud").strip()

    raw_smtp_toggle = env_map.get("ENABLE_SMTP_FALLBACK")
    if raw_smtp_toggle is not None and str(raw_smtp_toggle).strip() != "":
        enable_smtp_fallback = str(raw_smtp_toggle).strip() in ("1", "true", "True", "yes")
    else:
        enable_smtp_fallback = bool(int(db_cfg.get("enable_smtp_fallback") or 0) == 1)

    if not plain_text_body:
        import re
        plain_text_body = re.sub(r"<[^>]+>", "", html_body).strip()

    entity_ref = f"{tag_ref}-{uuid.uuid4().hex[:10].upper()}"

    # 1. GỬI QUA RESEND API (Có tự động Fallback sang onboarding@resend.dev nếu domain đang chờ duyệt DNS)
    if resend_key and resend_key.startswith("re_") and "@" in str(recipient_email or ""):
        for candidate_sender in [from_addr, "NVIDIA Store CSKH <onboarding@resend.dev>"]:
            try:
                payload = {
                    "from": candidate_sender,
                    "to": [recipient_email],
                    "reply_to": reply_to,
                    "subject": subject,
                    "text": plain_text_body,
                    "html": html_body,
                    "headers": {
                        "X-Entity-Ref-ID": entity_ref,
                        "List-Unsubscribe": f"<mailto:{reply_to}?subject=unsubscribe>",
                        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
                    }
                }
                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "NvidiaStore-ResendMailer/6.8"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                return {
                    "sent": True,
                    "channel": f"RESEND ({candidate_sender})",
                    "status": f"DELIVERED_ID_{resp_json.get('id', 'OK')}"
                }
            except Exception as ex:
                last_resend_err = str(ex)
                continue

        if not enable_smtp_fallback:
            return {
                "sent": False,
                "channel": "RESEND_PENDING_DNS_VERIFY",
                "status": f"WAIT_DNS: {last_resend_err[:70]}"
            }

    # 2. PHƯƠNG ÁN PHỤ GMAIL SMTP (NẾU BẬT CÔNG TẮC DỰ PHÒNG)
    if enable_smtp_fallback and "@" in str(recipient_email or ""):
        smtp_sender = (env_map.get("GOOGLE_MAIL_SENDER") or db_cfg.get("google_mail_sender") or "").strip()
        smtp_pass = (env_map.get("GOOGLE_APP_PASSWORD") or db_cfg.get("google_app_password") or "").strip()
        if smtp_sender and smtp_pass:
            try:
                mime_msg = MIMEMultipart("alternative")
                mime_msg["Subject"] = subject
                mime_msg["From"] = f"NVIDIA Store CSKH <{smtp_sender}>"
                mime_msg["To"] = recipient_email
                mime_msg["Reply-To"] = reply_to
                mime_msg["X-Entity-Ref-ID"] = entity_ref
                mime_msg["List-Unsubscribe"] = f"<mailto:{smtp_sender}?subject=unsubscribe>"
                mime_msg.attach(MIMEText(plain_text_body, "plain", "utf-8"))
                mime_msg.attach(MIMEText(html_body, "html", "utf-8"))
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=7) as server:
                    server.login(smtp_sender, smtp_pass)
                    server.sendmail(smtp_sender, [recipient_email], mime_msg.as_string())
                return {
                    "sent": True,
                    "channel": f"GMAIL_SMTP_FALLBACK ({smtp_sender})",
                    "status": "SENT_SMTP_250_OK"
                }
            except Exception as ex:
                return {
                    "sent": False,
                    "channel": "GMAIL_SMTP_FALLBACK_ERR",
                    "status": f"SMTP_ERR: {str(ex)[:80]}"
                }

    return {
        "sent": False,
        "channel": "IN_APP_NOTIFICATION",
        "status": "LOGGED_ON_SYSTEM"
    }


def broadcast_legal_update_notification(article_code, title, audience="all", version=1, change_note=""):
    ensure_legal_notification_table()
    conn = get_db()
    cursor = conn.cursor()

    if audience == "buyer":
        cursor.execute("SELECT id, email, full_name, role FROM users WHERE role = 'buyer'")
    elif audience == "seller":
        cursor.execute("SELECT id, email, full_name, role FROM users WHERE role = 'seller'")
    else:
        cursor.execute("SELECT id, email, full_name, role FROM users")
    users = [dict(r) for r in cursor.fetchall()]

    notif_title = f"⚖️ Cập nhật Điều khoản [{article_code}] (Phiên bản v{version})"
    notif_msg = f"{title} — Nội dung cập nhật: {change_note or 'Đồng bộ quy chuẩn mới trên sàn.'}"

    email_sent_count = 0
    for u in users:
        uid = u["id"]
        u_email = (u.get("email") or f"user{uid}@nvidia.castle-tech.cloud").strip()
        u_name = u.get("full_name") or f"Thành viên #{uid}"

        cursor.execute(
            """
            INSERT INTO user_notifications (user_id, notif_type, title, message, is_read)
            VALUES (?, 'legal_update', ?, ?, 0)
            """,
            (uid, notif_title, notif_msg)
        )

        subject = f"[Nivida CSKH] Thông báo cập nhật {article_code} (v{version}) - {title}"
        plain_body = f"Xin chào {u_name},\nNivida thông báo cập nhật {article_code} (v{version}): {title}.\nChi tiết: {change_note}"
        html_body = f"""
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;color:#0f172a;">
            <h3 style="color:#76b900;margin-top:0;">THÔNG BÁO CẬP NHẬT ĐIỀU KHOẢN — NIVIDA</h3>
            <p>Xin chào <strong>{u_name}</strong>,</p>
            <div style="background:#f8fafc;padding:14px;border-left:4px solid #76b900;border-radius:6px;margin:14px 0;">
                <div><strong>Mã điều khoản:</strong> {article_code} (Phiên bản v{version})</div>
                <div><strong>Tiêu đề:</strong> {title}</div>
                <div><strong>Nội dung điều chỉnh:</strong> {change_note}</div>
            </div>
        </div>
        """
        mail_res = send_transactional_email_v2(u_email, subject, html_body, plain_body, tag_ref=article_code)
        if mail_res.get("sent"):
            email_sent_count += 1

        cursor.execute(
            """
            INSERT INTO legal_email_logs (article_code, recipient_email, audience, delivery_mode, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (article_code, u_email, audience, mail_res["channel"], mail_res["status"])
        )

    conn.commit()
    conn.close()
    return {"notified_users": len(users), "emails_sent": email_sent_count}


def _is_request_from_strict_admin(data_payload=None):
    from flask import session
    data = data_payload or request.get_json(silent=True) or {}
    uid = session.get("user_id") or data.get("admin_user_id") or request.args.get("admin_user_id", type=int)
    if not uid:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    return bool(row and str(row[0] or "").strip().lower() == "admin")


def _is_request_from_strict_admin(data_payload=None):
    from flask import session
    data = data_payload or request.get_json(silent=True) or {}
    uid = session.get("user_id") or data.get("admin_user_id") or request.args.get("admin_user_id", type=int)
    if not uid:
        return False
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    return bool(row and str(row[0] or "").strip().lower() == "admin")


@bp.route("/clauses", methods=["GET", "POST"])
def handle_legal_clauses():
    all_rows = sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=False)

    if request.method == "GET":
        audience = (request.args.get("audience") or "all").strip().lower()
        q = (request.args.get("q") or "").strip().casefold()
        user_id = request.args.get("user_id", type=int)

        filtered = []
        for r in all_rows:
            if audience not in ("all", "") and (r.get("audience") or "all").lower() not in (audience, "all"):
                continue
            if q:
                hay = f"{r.get('article_code', '')} {r.get('title', '')} {r.get('content', '')} {r.get('change_note', '')}".casefold()
                if q not in hay:
                    continue
            filtered.append(r)

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM legal_user_acceptances")
        total_acceptances = int(cursor.fetchone()[0] or 0)
        user_accepted = None
        if user_id:
            cursor.execute("SELECT * FROM legal_user_acceptances WHERE user_id = ? ORDER BY id DESC LIMIT 1", (user_id,))
            ar = cursor.fetchone()
            if ar:
                user_accepted = dict(ar)
        conn.close()

        return jsonify({
            "ok": True,
            "source_json_file": "data_json/4_dieu_khoan_phap_ly.json",
            "total_clauses": len(all_rows),
            "filtered_count": len(filtered),
            "total_acceptances": total_acceptances,
            "user_accepted": user_accepted,
            "clauses": filtered
        }), 200

    # POST: Chỉ Quản trị viên (Admin) mới được phép ban hành hoặc sửa đổi điều khoản
    data = request.get_json(silent=True) or {}
    if not _is_request_from_strict_admin(data):
        return jsonify({"error": "🔒 Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền ban hành hoặc chỉnh sửa điều khoản pháp lý!"}), 403

    code = (data.get("article_code") or "").strip().upper()
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    audience = (data.get("audience") or "all").strip().lower()
    eff_date = (data.get("effective_date") or "2026-11-15").strip()[:10]
    change_note = (data.get("change_note") or "Cập nhật quy định pháp lý").strip()
    sop_ref = (data.get("sop_reference") or f"SOP-{code}").strip()
    edited_by = (data.get("edited_by") or "Quản Trị Viên").strip()

    if not code or not title or not content:
        return jsonify({"error": "Vui lòng nhập đầy đủ Mã điều khoản, Tiêu đề và Nội dung!"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM legal_clauses WHERE UPPER(article_code) = ? OR id = ?", (code, data.get("id") or -1))
    existing = cursor.fetchone()

    if existing:
        ex_dict = dict(existing)
        new_ver = int(ex_dict.get("version") or 1) + 1
        cid = ex_dict["id"]
        cursor.execute(
            """
            UPDATE legal_clauses
            SET article_code = ?, title = ?, content = ?, audience = ?, version = ?,
                effective_date = ?, change_note = ?, sop_reference = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (code, title, content, audience, new_ver, eff_date, change_note, sop_ref, cid)
        )
    else:
        new_ver = 1
        cursor.execute(
            """
            INSERT INTO legal_clauses (
                article_code, title, content, audience, version, effective_date, change_note, sop_reference
            ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            """,
            (code, title, content, audience, eff_date, change_note, sop_ref)
        )
        cid = cursor.lastrowid

    cursor.execute(
        """
        INSERT INTO legal_clause_history (clause_id, article_code, version, title, content, audience, change_note, edited_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (cid, code, new_ver, title, content, audience, change_note, edited_by)
    )
    conn.commit()
    conn.close()

    sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=False)
    b_res = broadcast_legal_update_notification(code, title, audience, new_ver, change_note)

    return jsonify({
        "ok": True,
        "clause_id": cid,
        "article_code": code,
        "version": new_ver,
        "broadcast": b_res,
        "message": f"⚖️ Đã lưu [{code}] (v{new_ver}) vào SQLite & tệp JSON, đồng thời phát thông báo tới {b_res['notified_users']} thành viên!"
    }), 200


@bp.route("/clauses/<int:clause_id>", methods=["PUT", "DELETE"])
def handle_single_legal_clause(clause_id):
    ensure_legal_notification_table()
    data = request.get_json(silent=True) or {}
    if not _is_request_from_strict_admin(data):
        return jsonify({"error": "🔒 Chỉ Quản trị viên (Admin) mới có quyền xóa hoặc sửa điều khoản!"}), 403

    if request.method == "DELETE":
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM legal_clauses WHERE id = ?", (clause_id,))
        conn.commit()
        conn.close()
        sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=False)
        return jsonify({"ok": True, "message": f"Đã xóa điều khoản ID #{clause_id} và đồng bộ tệp JSON!"}), 200

    return handle_legal_clauses()


@bp.route("/history/<string:article_code>", methods=["GET"])
def get_clause_version_history(article_code):
    ensure_legal_notification_table()
    code = article_code.strip().upper()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM legal_clause_history WHERE UPPER(article_code) = ? ORDER BY version DESC, id DESC", (code,))
    rows = [dict(r) for r in cursor.fetchall()]
    if not rows:
        cursor.execute("SELECT * FROM legal_clauses WHERE UPPER(article_code) = ?", (code,))
        c_row = cursor.fetchone()
        if c_row:
            cd = dict(c_row)
            rows = [{
                "article_code": cd.get("article_code"),
                "version": cd.get("version") or 1,
                "title": cd.get("title"),
                "content": cd.get("content"),
                "audience": cd.get("audience"),
                "change_note": cd.get("change_note") or "Bản ghi gốc từ tệp JSON hệ thống",
                "edited_by": "JSON / Admin",
                "updated_at": cd.get("updated_at")
            }]
    conn.close()
    return jsonify({"ok": True, "article_code": code, "history": rows}), 200


@bp.route("/sync-json", methods=["POST", "GET"])
def sync_or_import_legal_json():
    ensure_legal_notification_table()
    if request.method == "GET":
        rows = sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=True)
        return jsonify({
            "ok": True,
            "count": len(rows),
            "clauses": rows,
            "message": f"📂 Đã tự động đọc và đồng bộ {len(rows)} điều khoản từ tệp data_json/4_dieu_khoan_phap_ly.json vào SQLite!"
        }), 200

    data = request.get_json(silent=True) or {}
    raw_items = data.get("clauses") if isinstance(data, dict) else data
    if not isinstance(raw_items, list) or not raw_items:
        rows = sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=True)
        return jsonify({
            "ok": True,
            "count": len(rows),
            "clauses": rows,
            "message": f"📂 Đã đồng bộ {len(rows)} điều khoản từ data_json/4_dieu_khoan_phap_ly.json!"
        }), 200

    os.makedirs(os.path.dirname(LEGAL_JSON_FILE), exist_ok=True)
    with open(LEGAL_JSON_FILE, "w", encoding="utf-8") as wf:
        json.dump(raw_items, wf, ensure_ascii=False, indent=2)

    rows = sync_legal_clauses_between_json_and_sqlite(force_reload_from_json=True)
    return jsonify({
        "ok": True,
        "count": len(rows),
        "clauses": rows,
        "message": f"✅ Đã nạp thủ công {len(rows)} điều khoản từ JSON vào SQLite và lưu vào data_json/4_dieu_khoan_phap_ly.json!"
    }), 200


@bp.route("/accept", methods=["POST"])
def record_user_legal_acceptance():
    ensure_legal_notification_table()
    data = request.get_json(silent=True) or {}
    user_id = int(data.get("user_id") or 1)
    user_name = (data.get("user_name") or "Thành viên xác thực").strip()
    role = (data.get("role") or "buyer").strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT article_code, version FROM legal_clauses ORDER BY article_code ASC")
    ver_str = "|".join(f"{r[0]}:v{r[1]}" for r in cursor.fetchall())
    ver_hash = "NVX-LEGAL-" + hashlib.sha256(ver_str.encode("utf-8")).hexdigest()[:10].upper()

    cursor.execute(
        """
        INSERT INTO legal_user_acceptances (user_id, user_name, role, clauses_version_hash)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, user_name, role, ver_hash)
    )
    conn.commit()
    conn.close()
    return jsonify({
        "ok": True,
        "signature_hash": ver_hash,
        "message": f"✍️ Đã ghi nhận chữ ký xác nhận tuân thủ Điều khoản sàn (Mã chứng thực: {ver_hash})!"
    }), 200


@bp.route("/email-logs", methods=["GET"])
def get_legal_email_audit_logs():
    ensure_legal_notification_table()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM legal_email_logs ORDER BY id DESC LIMIT 50")
    logs = [dict(r) for r in cursor.fetchall()]
    cursor.execute("SELECT COUNT(*) FROM user_notifications WHERE notif_type = 'legal_update'")
    notif_count = int(cursor.fetchone()[0] or 0)
    conn.close()
    return jsonify({
        "ok": True,
        "email_logs": logs,
        "total_broadcast_notifications": notif_count
    }), 200
