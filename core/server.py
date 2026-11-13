import os
from flask import Flask, send_from_directory, redirect
from dotenv import load_dotenv
from database.db_manager import init_db

from services.home.api import bp as home_bp
from services.auth.api import bp as auth_bp
from services.product.api import bp as product_bp
from services.seller.api import bp as seller_bp
from services.cart_checkout.api import bp as order_bp
from services.settings.api import bp as settings_bp
from services.minigame.api import bp as minigame_bp
from services.admin_dispute.api import bp as admin_dispute_bp
from services.legal.api import bp as legal_bp
from services.pc_builder.api import bp as pc_builder_bp
from services.compare.api import bp as compare_bp
from services.vouchers_deals.api import bp as vouchers_bp
from services.order_tracking.api import bp as tracking_bp

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def create_app():
    app = Flask(__name__, static_folder=None)
    app.secret_key = os.getenv("SECRET_KEY", "dev_secret_key")

    os.makedirs(os.path.join(BASE_DIR, "assets", "uploads", "products"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "assets", "uploads", "avatars"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "assets", "icons"), exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "assets", "banners"), exist_ok=True)

    init_db()

    app.register_blueprint(home_bp, url_prefix="/api/home")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api/products")
    app.register_blueprint(seller_bp, url_prefix="/api/seller")
    app.register_blueprint(order_bp, url_prefix="/api/orders")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(minigame_bp, url_prefix="/api/minigame")
    app.register_blueprint(admin_dispute_bp, url_prefix="/api/admin-dispute")
    app.register_blueprint(legal_bp, url_prefix="/api/legal")
    app.register_blueprint(pc_builder_bp, url_prefix="/api/pc-builder")
    app.register_blueprint(compare_bp, url_prefix="/api/compare")
    app.register_blueprint(vouchers_bp, url_prefix="/api/vouchers")
    app.register_blueprint(tracking_bp, url_prefix="/api/tracking")

    @app.route("/")
    def index():
        return redirect("/services/home/index.html")

    @app.route("/tools/standalone_terms_builder.html")
    def serve_standalone_terms():
        return send_from_directory(BASE_DIR, "tools/standalone_terms_builder.html")

    @app.route("/core/<path:filename>")
    def serve_core(filename):
        return send_from_directory(os.path.join(BASE_DIR, "core"), filename)

    @app.route("/components/<path:filename>")
    def serve_components(filename):
        return send_from_directory(os.path.join(BASE_DIR, "components"), filename)

    @app.route("/assets/<path:filename>")
    def serve_assets(filename):
        return send_from_directory(os.path.join(BASE_DIR, "assets"), filename)

    @app.route("/services/<service_name>/<path:filename>")
    def serve_service_files(service_name, filename):
        if filename.endswith(".py"):
            return "Forbidden", 403
        return send_from_directory(os.path.join(BASE_DIR, "services", service_name), filename)

    return app