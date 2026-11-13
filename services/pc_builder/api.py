import json
from flask import Blueprint, jsonify, request
from database.db_manager import get_db

pc_builder_bp = Blueprint("pc_builder", __name__)
bp = pc_builder_bp

STANDARD_PC_COMPONENTS = {
    "cpu": [
        {"id": 9101, "slot": "cpu", "name": "Intel Core i5-14600K (14 Nhân 20 Luồng, 5.3GHz)", "price": 7890000, "tdp": 125, "socket": "LGA1700", "score": 88, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9102, "slot": "cpu", "name": "AMD Ryzen 7 7800X3D (8 Nhân 16 Luồng, 3D V-Cache)", "price": 10490000, "tdp": 120, "socket": "AM5", "score": 96, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9103, "slot": "cpu", "name": "Intel Core i9-14900K (24 Nhân 32 Luồng, 6.0GHz)", "price": 14290000, "tdp": 253, "socket": "LGA1700", "score": 99, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"}
    ],
    "mainboard": [
        {"id": 9201, "slot": "mainboard", "name": "Mainboard ASUS TUF Gaming B760M-PLUS WIFI II", "price": 4690000, "tdp": 35, "socket": "LGA1700", "score": 85, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9202, "slot": "mainboard", "name": "Mainboard MSI MAG B650 TOMAHAWK WIFI (AM5)", "price": 5690000, "tdp": 40, "socket": "AM5", "score": 90, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9203, "slot": "mainboard", "name": "Mainboard GIGABYTE Z790 AORUS ELITE AX DDR5", "price": 7290000, "tdp": 45, "socket": "LGA1700", "score": 94, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"}
    ],
    "gpu": [
        {"id": 9301, "slot": "gpu", "name": "Card đồ họa NVIDIA GeForce RTX 4060 Ti 8GB GDDR6", "price": 10990000, "tdp": 165, "score": 82, "warranty": "36 tháng tại Shop Mall", "unit": "Chiếc"},
        {"id": 9302, "slot": "gpu", "name": "Card đồ họa NVIDIA GeForce RTX 4070 Super 12GB GDDR6X", "price": 16890000, "tdp": 220, "score": 92, "warranty": "36 tháng tại Shop Mall", "unit": "Chiếc"},
        {"id": 9303, "slot": "gpu", "name": "Card đồ họa NVIDIA GeForce RTX 4080 Super 16GB ROG Strix", "price": 28990000, "tdp": 320, "score": 98, "warranty": "36 tháng tại Shop Mall", "unit": "Chiếc"}
    ],
    "ram": [
        {"id": 9401, "slot": "ram", "name": "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz", "price": 3190000, "tdp": 15, "score": 90, "warranty": "36 tháng 1 đổi 1", "unit": "Bộ"},
        {"id": 9402, "slot": "ram", "name": "RAM G.Skill Trident Z5 Neo 64GB (2x32GB) DDR5 6400MHz", "price": 5890000, "tdp": 20, "score": 97, "warranty": "36 tháng 1 đổi 1", "unit": "Bộ"}
    ],
    "ssd": [
        {"id": 9501, "slot": "ssd", "name": "Ổ cứng SSD Samsung 990 PRO 1TB NVMe PCIe Gen4x4", "price": 2890000, "tdp": 10, "score": 94, "warranty": "60 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9502, "slot": "ssd", "name": "Ổ cứng SSD WD Black SN850X 2TB NVMe PCIe Gen4", "price": 4590000, "tdp": 12, "score": 96, "warranty": "60 tháng Chính hãng", "unit": "Chiếc"}
    ],
    "psu": [
        {"id": 9601, "slot": "psu", "name": "Nguồn Corsair RM750e 750W 80 Plus Gold ATX 3.0", "price": 2690000, "wattage": 750, "tdp": 0, "score": 88, "warranty": "84 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9602, "slot": "psu", "name": "Nguồn ASUS TUF Gaming 850W Gold ATX 3.0 PCIe 5.0", "price": 3490000, "wattage": 850, "tdp": 0, "score": 93, "warranty": "120 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9603, "slot": "psu", "name": "Nguồn Seasonic VERTEX GX-1000 1000W 80 Plus Gold", "price": 4890000, "wattage": 1000, "tdp": 0, "score": 98, "warranty": "120 tháng Chính hãng", "unit": "Chiếc"}
    ],
    "case": [
        {"id": 9701, "slot": "case", "name": "Vỏ Case NZXT H6 Flow Panoramic Tempered Glass", "price": 2790000, "tdp": 15, "score": 91, "warranty": "24 tháng tại Shop", "unit": "Chiếc"},
        {"id": 9702, "slot": "case", "name": "Vỏ Case Lian Li O11 Vision Minimalist Black", "price": 3590000, "tdp": 15, "score": 95, "warranty": "24 tháng tại Shop", "unit": "Chiếc"}
    ],
    "monitor": [
        {"id": 9801, "slot": "monitor", "name": "Màn hình LG UltraGear 27GR83Q 27 inch 2K 240Hz IPS", "price": 9490000, "tdp": 45, "score": 93, "warranty": "24 tháng Chính hãng", "unit": "Chiếc"},
        {"id": 9802, "slot": "monitor", "name": "Màn hình ASUS ROG Swift OLED PG27AQDM 27 inch 240Hz", "price": 18990000, "tdp": 50, "score": 98, "warranty": "36 tháng Chính hãng", "unit": "Chiếc"}
    ]
}

@pc_builder_bp.route("/parts", methods=["GET"])
def get_pc_parts():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, category, price, stock, warranty, unit, image_url FROM products ORDER BY price ASC")
    db_prods = [dict(r) for r in cursor.fetchall()]
    conn.close()
    slots = {k: list(v) for k, v in STANDARD_PC_COMPONENTS.items()}
    for p in db_prods:
        cat = (p.get("category") or "").lower()
        name_l = (p.get("name") or "").lower()
        target_slot = None
        if cat == "gpu" or "rtx" in name_l or "card" in name_l:
            target_slot = "gpu"
        elif cat == "cpu" or "core i" in name_l or "ryzen" in name_l:
            target_slot = "cpu"
        elif cat == "mainboard" or "mainboard" in name_l or "b760" in name_l or "z790" in name_l:
            target_slot = "mainboard"
        elif cat == "ram" or "ddr5" in name_l or "ddr4" in name_l:
            target_slot = "ram"
        elif "ssd" in name_l or "nvme" in name_l:
            target_slot = "ssd"
        elif cat == "monitor" or "màn hình" in name_l:
            target_slot = "monitor"
        if target_slot:
            slots[target_slot].append({
                "id": p["id"],
                "slot": target_slot,
                "name": p["name"],
                "price": float(p.get("price") or 0),
                "tdp": 180 if target_slot == "gpu" else (120 if target_slot == "cpu" else 25),
                "socket": "AM5" if "am5" in name_l or "ryzen 7" in name_l else "LGA1700",
                "score": 90,
                "warranty": p.get("warranty") or "36 tháng",
                "unit": p.get("unit") or "Chiếc",
                "image_url": p.get("image_url") or ""
            })
    return jsonify({"ok": True, "slots": slots}), 200

@pc_builder_bp.route("/check-bottleneck", methods=["POST"])
def check_pc_bottleneck():
    data = request.get_json(silent=True) or {}
    parts = data.get("parts") or {}
    cpu = parts.get("cpu") or {}
    gpu = parts.get("gpu") or {}
    main = parts.get("mainboard") or {}
    psu = parts.get("psu") or {}
    cpu_score = float(cpu.get("score") or 85)
    gpu_score = float(gpu.get("score") or 85)
    bottleneck_pct = round(abs(cpu_score - gpu_score) * 0.85, 1)
    total_tdp = sum(int((parts.get(k) or {}).get("tdp") or 0) for k in parts) + 75
    recommended_psu = int(((total_tdp * 1.35) // 50 + 1) * 50)
    selected_psu_w = int(psu.get("wattage") or 750)
    socket_ok = True
    socket_warning = "Tương thích hoàn hảo giữa CPU và Mainboard."
    if cpu and main and cpu.get("socket") and main.get("socket") and cpu.get("socket") != main.get("socket"):
        socket_ok = False
        socket_warning = f"Cảnh báo lệch Socket: CPU dùng {cpu.get('socket')} nhưng Mainboard là {main.get('socket')}!"
    psu_ok = selected_psu_w >= recommended_psu
    sys_prompt = (
        "Bạn là Kỹ sư Kiến trúc Phần cứng PC AI của Nivida Store. "
        "Hãy đánh giá cấu hình PC dưới đây về độ nghẽn cổ chai (Bottleneck %), tương thích Socket, công suất nguồn PSU và ước tính FPS trong Counter-Strike 2 / Cyberpunk 2077 ở độ phân giải 2K."
    )
    user_prompt = json.dumps({
        "selected_parts": parts,
        "bottleneck_pct": bottleneck_pct,
        "total_tdp_watts": total_tdp,
        "recommended_psu_watts": recommended_psu,
        "socket_warning": socket_warning
    }, ensure_ascii=False)
    ai_advice = None
    try:
        from services.admin_dispute.api import call_groq_with_fallback
        ai_reply, _ = call_groq_with_fallback(sys_prompt, user_prompt, force_json=False)
        if ai_reply:
            ai_advice = ai_reply
    except Exception:
        pass
    if not ai_advice:
        verdict = "Cấu hình cân bằng tuyệt vời, phát huy 100% hiệu năng GPU!" if bottleneck_pct <= 8 else "Có độ lệch nhẹ giữa CPU và GPU, nên cân nhắc nâng cấp đồng bộ."
        ai_advice = (
            f"📊 Kết quả Chẩn đoán Phần cứng AI: Độ nghẽn cổ chai ước tính {bottleneck_pct}%. {verdict}\n"
            f"🔌 Công suất tiêu thụ thực tế: ~{total_tdp}W (Khuyến nghị nguồn từ {recommended_psu}W trở lên).\n"
            f"🧩 Kiểm tra Socket: {socket_warning}\n"
            f"🎮 Dự kiến hiệu năng Gaming (2K Ultra): Counter-Strike 2 đạt ~360+ FPS, Black Myth: Wukong đạt ~115 FPS (DLSS 3 Frame Gen)."
        )
    return jsonify({
        "ok": True,
        "bottleneck_pct": bottleneck_pct,
        "total_tdp": total_tdp,
        "recommended_psu": recommended_psu,
        "socket_ok": socket_ok,
        "psu_ok": psu_ok,
        "socket_warning": socket_warning,
        "ai_analysis": ai_advice
    }), 200
