import os
import sys
import json
import urllib.request
from urllib.error import URLError, HTTPError
from datetime import datetime, timedelta
import MetaTrader5 as mt5
from dotenv import load_dotenv

# ==========================================
# KONFIGURASI AKUN TRADE HITOSHI (SUPABASE)
# ==========================================
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di file .env")
    exit(1)

# EMAIL & PASSWORD LOGIN SUPABASE
USER_EMAIL = "kulbetfiii@gmail.com"
USER_PASSWORD = "Bihara2005"

# ==========================================
# FUNGSI SUPABASE REST API
# ==========================================
def supabase_login(email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    data = json.dumps({"email": email, "password": password}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            return res_data['access_token'], res_data['user']['id']
    except HTTPError as e:
        print(f"Error Login: {e.read().decode()}")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def get_trade_by_position_id(token, position_id):
    url = f"{SUPABASE_URL}/rest/v1/trades?select=id,result,notes&notes=like.*{position_id}*"
    req = urllib.request.Request(url, method='GET')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {token}')
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            if res_data and len(res_data) > 0:
                return res_data[0]
            return None
    except Exception:
        return None

def insert_trade(token, trade_data):
    url = f"{SUPABASE_URL}/rest/v1/trades"
    data = json.dumps(trade_data).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status in (201, 204)
    except HTTPError as e:
        print(f"Error Insert: {e.read().decode()}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def update_trade(token, trade_id, update_data):
    url = f"{SUPABASE_URL}/rest/v1/trades?id=eq.{trade_id}"
    data = json.dumps(update_data).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='PATCH')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status in (200, 204)
    except HTTPError as e:
        print(f"Error Update: {e.read().decode()}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def sync_account_metrics(token, user_id, acc):
    url = f"{SUPABASE_URL}/rest/v1/settings?user_id=eq.{user_id}"
    payload = {
        "user_id": user_id,
        "live_balance": float(acc.balance),
        "live_equity": float(acc.equity),
        "live_profit": float(acc.profit),
        "live_margin": float(acc.margin),
        "live_margin_free": float(acc.margin_free),
        "server": str(acc.server),
        "account_login": str(acc.login),
        "currency": str(acc.currency),
        "last_sync": datetime.now().isoformat()
    }
    
    req_get = urllib.request.Request(url, method='GET')
    req_get.add_header('apikey', SUPABASE_KEY)
    req_get.add_header('Authorization', f'Bearer {token}')
    
    try:
        with urllib.request.urlopen(req_get) as response:
            existing = json.loads(response.read().decode())
            if existing and len(existing) > 0:
                update_url = f"{SUPABASE_URL}/rest/v1/settings?id=eq.{existing[0]['id']}"
                req_patch = urllib.request.Request(update_url, data=json.dumps(payload).encode('utf-8'), method='PATCH')
                req_patch.add_header('apikey', SUPABASE_KEY)
                req_patch.add_header('Authorization', f'Bearer {token}')
                req_patch.add_header('Content-Type', 'application/json')
                req_patch.add_header('Prefer', 'return=minimal')
                with urllib.request.urlopen(req_patch) as patch_res:
                    return patch_res.status in (200, 204)
            else:
                insert_url = f"{SUPABASE_URL}/rest/v1/settings"
                payload["initial_capital"] = float(acc.balance)
                req_post = urllib.request.Request(insert_url, data=json.dumps(payload).encode('utf-8'), method='POST')
                req_post.add_header('apikey', SUPABASE_KEY)
                req_post.add_header('Authorization', f'Bearer {token}')
                req_post.add_header('Content-Type', 'application/json')
                req_post.add_header('Prefer', 'return=minimal')
                with urllib.request.urlopen(req_post) as post_res:
                    return post_res.status in (201, 204)
    except Exception as e:
        print(f"[-] Gagal update telemetry akun: {e}")
        return False

def get_ignored_tickets(token, user_id):
    url = f"{SUPABASE_URL}/rest/v1/ignored_tickets?user_id=eq.{user_id}&select=ticket"
    req = urllib.request.Request(url, method='GET')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {token}')
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return set(str(item['ticket']) for item in data if 'ticket' in item)
    except Exception as e:
        print(f"[-] Gagal mengambil daftar blacklist/ignored tickets: {e}")
        return set()

# ==========================================
# FUNGSI UTAMA
# ==========================================
def main():
    print("=== Trade Hitoshi MT5 Auto-Sync ===")
    
    # 1. Login ke Supabase
    print("Menghubungkan ke Supabase (via REST API)...")
    token, user_id = supabase_login(USER_EMAIL, USER_PASSWORD)
    
    if not token:
        print("Gagal login! Pastikan USER_EMAIL dan USER_PASSWORD sudah diisi dengan benar.")
        return
        
    print(f"Berhasil login ke jurnal! User ID: {user_id}")

    # Ambil daftar tiket transaksi yang dihapus/diblacklist oleh user di web
    ignored_tickets = get_ignored_tickets(token, user_id)
    if ignored_tickets:
        print(f"[*] Terdeteksi {len(ignored_tickets)} tiket yang dihapus/diblacklist di Web (tidak akan ditarik ulang).")

    # 2. Inisialisasi MetaTrader 5
    print("\nMenghubungkan ke MetaTrader 5...")
    if not mt5.initialize():
        print("initialize() gagal, pastikan MT5 terbuka. Error code =", mt5.last_error())
        return
        
    term_info = mt5.terminal_info()
    acc_info = mt5.account_info()
    print(f"MT5 Terhubung! Terminal: {term_info.name} | Broker: {acc_info.server}")
    print(f"Akun MT5: {acc_info.login} ({acc_info.name}) | Currency: {acc_info.currency}")
    print(f"Live Balance: ${acc_info.balance:.2f} | Live Equity: ${acc_info.equity:.2f} | Floating: ${acc_info.profit:+.2f}")

    # Sinkronisasi Info Akun Realtime ke Supabase
    if sync_account_metrics(token, user_id, acc_info):
        print("[+] Status Akun Realtime Berhasil Disinkronkan ke Web Dashboard!")

    synced_open_count = 0
    synced_closed_count = 0

    # 3. SINKRONISASI POSISI BERJALAN / OPEN POSITIONS (Status: Pending)
    print("\n--- Memeriksa Posisi Berjalan (Open Positions) ---")
    open_positions = mt5.positions_get()
    if open_positions:
        print(f"Ditemukan {len(open_positions)} posisi aktif berjalan di MT5.")
        for p in open_positions:
            if str(p.ticket) in ignored_tickets:
                print(f"[-] Dilewati (Dihapus dari Web / Blacklist): Posisi Berjalan ID {p.ticket}")
                continue
            
            direction = "Long" if p.type == 0 else "Short"
            market = "Crypto" if ("BTC" in p.symbol.upper() or "ETH" in p.symbol.upper()) else "Forex"
            
            # Hitung planned RR
            risk = abs(p.price_open - p.sl) if (p.sl > 0 and p.sl != p.price_open) else 0
            reward = abs(p.tp - p.price_open) if p.tp > 0 else 0
            rr_planned = round(reward / risk, 2) if risk > 0 else 0

            open_time_iso = datetime.fromtimestamp(p.time).isoformat()
            
            existing = get_trade_by_position_id(token, p.ticket)
            if not existing:
                open_trade_data = {
                    "user_id": user_id,
                    "date": open_time_iso,
                    "pair": p.symbol,
                    "market": market,
                    "direction": direction,
                    "timeframe": "MT5 Sync",
                    "entry_price": p.price_open,
                    "exit_price": None,
                    "stop_loss": p.sl if p.sl > 0 else None,
                    "take_profit": p.tp if p.tp > 0 else None,
                    "position_size": p.volume,
                    "pnl_nominal": p.profit,
                    "fee": 0,
                    "result": "Pending",
                    "rr_planned": rr_planned,
                    "rr_realized": None,
                    "notes": f"Auto-synced from MT5 (Running/Open). Position ID: {p.ticket} | Ticket: {p.ticket}"
                }
                if insert_trade(token, open_trade_data):
                    print(f"[+] Posisi Berjalan Ditambahkan: {direction} {p.volume} {p.symbol} @ {p.price_open} | Floating: ${p.profit:.2f}")
                    synced_open_count += 1
            else:
                if existing.get('result') == 'Pending':
                    update_data = {
                        "pnl_nominal": p.profit,
                        "stop_loss": p.sl if p.sl > 0 else None,
                        "take_profit": p.tp if p.tp > 0 else None
                    }
                    if update_trade(token, existing['id'], update_data):
                        print(f"[*] Posisi Berjalan Diperbarui: {p.symbol} (ID: {p.ticket}) | Floating: ${p.profit:.2f}")
    else:
        print("Tidak ada posisi berjalan yang aktif saat ini.")

    # 4. SINKRONISASI HISTORI TRANSAKSI YANG SUDAH DITUTUP
    days_back = 7
    if len(sys.argv) > 1:
        try:
            days_back = int(sys.argv[1])
        except ValueError:
            pass
            
    now = datetime.now()
    date_from = now - timedelta(days=days_back)
    
    print(f"\n--- Mengambil Histori Deals ({days_back} hari terakhir) ---")
    deals = mt5.history_deals_get(date_from, now + timedelta(days=1))
    
    if deals is None:
        print("Tidak ada deal histori yang ditemukan, error code =", mt5.last_error())
    else:
        print(f"Ditemukan {len(deals)} transaksi di histori MT5.")
        for deal in deals:
            # Lewati jika transaksi sudah pernah dihapus/diblacklist oleh user dari web
            if str(deal.position_id) in ignored_tickets or str(deal.ticket) in ignored_tickets:
                print(f"[-] Dilewati (Dihapus dari Web / Blacklist): Position ID {deal.position_id} / Deal {deal.ticket}")
                continue

            # Lewati deal balance deposit/withdrawal atau entry-in jika posisinya sudah ditutup
            if deal.entry != 1:
                continue
                
            if deal.type not in [0, 1]: 
                continue

            direction = "Short" if deal.type == 0 else "Long"
            pnl = deal.profit
            fee = deal.commission + deal.swap
            market = "Crypto" if ("BTC" in deal.symbol.upper() or "ETH" in deal.symbol.upper()) else "Forex"
            
            if pnl > 0: result = "Win"
            elif pnl < 0: result = "Loss"
            else: result = "BE"
                
            close_time = datetime.fromtimestamp(deal.time).isoformat()
            
            # Ambil data order untuk Entry Price, SL, dan TP
            orders = mt5.history_orders_get(position=deal.position_id)
            entry_price = 0
            sl = 0
            tp = 0
            rr_planned = 0
            rr_realized = 0

            if orders and len(orders) > 0:
                entry_order = orders[0]
                entry_price = entry_order.price_open
                sl = entry_order.sl
                tp = entry_order.tp

                if entry_price > 0 and sl > 0 and sl != entry_price:
                    risk = abs(entry_price - sl)
                    if tp > 0:
                        reward = abs(tp - entry_price)
                        rr_planned = round(reward / risk, 2)
                        
                    realized_reward = abs(deal.price - entry_price)
                    if pnl > 0:
                        rr_realized = round(realized_reward / risk, 2)
                    elif pnl < 0:
                        rr_realized = round(-realized_reward / risk, 2)

            existing = get_trade_by_position_id(token, deal.position_id)
            
            if not existing:
                trade_data = {
                    "user_id": user_id,
                    "date": close_time,
                    "pair": deal.symbol,
                    "market": market, 
                    "direction": direction,
                    "timeframe": "MT5 Sync",
                    "entry_price": entry_price,
                    "exit_price": deal.price,
                    "stop_loss": sl,
                    "take_profit": tp,
                    "position_size": deal.volume,
                    "pnl_nominal": pnl,
                    "fee": fee,
                    "result": result,
                    "rr_planned": rr_planned,
                    "rr_realized": rr_realized,
                    "notes": f"Auto-synced from MT5. Position ID: {deal.position_id} | Ticket: {deal.ticket}"
                }
                if insert_trade(token, trade_data):
                    print(f"[+] Disinkronkan (Closed): {direction} {deal.volume} {deal.symbol} | PnL: ${pnl:.2f}")
                    synced_closed_count += 1
            elif existing.get('result') == 'Pending':
                # Posisi sebelumnya tercatat sebagai Pending, sekarang sudah ditutup
                update_data = {
                    "exit_price": deal.price,
                    "pnl_nominal": pnl,
                    "fee": fee,
                    "result": result,
                    "rr_realized": rr_realized,
                    "date": close_time,
                    "notes": f"Auto-synced from MT5. Position ID: {deal.position_id} | Ticket: {deal.ticket}"
                }
                if update_trade(token, existing['id'], update_data):
                    print(f"[+] Trade Ditutup & Diperbarui: {direction} {deal.symbol} | PnL: ${pnl:.2f} ({result})")
                    synced_closed_count += 1
            else:
                print(f"[-] Dilewati: Sudah ada di jurnal (Position ID: {deal.position_id})")

    print(f"\n==========================================")
    print(f"Sinkronisasi selesai!")
    print(f"- Posisi Berjalan (Open): {synced_open_count} baru ditambahkan")
    print(f"- Transaksi Ditutup (Closed): {synced_closed_count} diproses")
    print(f"==========================================")
    mt5.shutdown()

if __name__ == "__main__":
    main()
