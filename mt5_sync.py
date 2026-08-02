import os
import json
import urllib.request
from urllib.error import URLError, HTTPError
from datetime import datetime, timedelta
import MetaTrader5 as mt5
from dotenv import load_dotenv

# ==========================================
# KONFIGURASI AKUN TRADE HITOSHI (SUPABASE)
# ==========================================
# Script ini akan otomatis membaca .env untuk URL & Key Supabase
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan di file .env")
    exit(1)

# MASUKKAN EMAIL & PASSWORD LOGIN APLIKASI JURNAL ANDA DI SINI
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

def check_trade_exists(token, position_id, ticket):
    # Cek berdasarkan exact ticket (format baru) atau exact position_id (format lama)
    # Menggunakan format lama agar trade yang sudah disinkronisasi sebelumnya tidak duplikat
    url = f"{SUPABASE_URL}/rest/v1/trades?select=id,notes&notes=like.*{position_id}*"
    req = urllib.request.Request(url, method='GET')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {token}')
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            # Jika menggunakan format baru (ada ticket), pastikan notes mengandung ticket tersebut
            for trade in res_data:
                if f"Ticket: {ticket}" in trade.get("notes", ""):
                    return True
                if trade.get("notes", "") == f"Auto-synced from MT5. Position ID: {position_id}":
                    return True
            return False
    except Exception:
        return False

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

    # 2. Inisialisasi MetaTrader 5
    print("\nMenghubungkan ke MetaTrader 5...")
    if not mt5.initialize():
        print("initialize() gagal, memastikan MT5 terbuka. Error code =", mt5.last_error())
        return
        
    print(f"MT5 Terhubung! Terminal info: {mt5.terminal_info().name}")

    # 3. Ambil Histori Trading (Contoh: 7 hari terakhir)
    now = datetime.now()
    date_from = now - timedelta(days=7) # Ubah ke days=1 jika ingin sinkronisasi harian saja
    
    print(f"Mengambil histori transaksi dari {date_from.strftime('%Y-%m-%d')} sampai sekarang...")
    # Tambahkan timedelta(days=1) ke now untuk memastikan perbedaan timezone broker tidak menyebabkan trade terbaru terlewat
    deals = mt5.history_deals_get(date_from, now + timedelta(days=1))
    
    if deals is None:
        print("Tidak ada deal yang ditemukan, error code =", mt5.last_error())
        mt5.shutdown()
        return

    print(f"Ditemukan {len(deals)} transaksi di MT5.")
    synced_count = 0
    
    # 4. Proses Transaksi (Filter hanya transaksi yang DITUTUP / DEAL_ENTRY_OUT)
    for deal in deals:
        if deal.entry != 1:
            print(f"[-] Transaksi {deal.ticket} dilewati: Bukan transaksi penutupan (deal.entry={deal.entry})")
            continue
            
        if deal.type not in [0, 1]: 
            print(f"[-] Transaksi {deal.ticket} dilewati: Tipe bukan Buy/Sell (deal.type={deal.type})")
            continue

        direction = "Short" if deal.type == 0 else "Long"
        pnl = deal.profit
        fee = deal.commission + deal.swap
        
        if pnl > 0: result = "Win"
        elif pnl < 0: result = "Loss"
        else: result = "BE"
            
        close_time = datetime.fromtimestamp(deal.time).isoformat()
        
        # Ambil data order untuk mendapatkan Entry Price, SL, dan TP
        orders = mt5.history_orders_get(position=deal.position_id)
        entry_price = 0
        sl = 0
        tp = 0
        rr_planned = 0
        rr_realized = 0

        if orders and len(orders) > 0:
            # Order pertama biasanya adalah order entry
            entry_order = orders[0]
            entry_price = entry_order.price_open
            sl = entry_order.sl
            tp = entry_order.tp

            # Kalkulasi RR
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

        trade_data = {
            "user_id": user_id,
            "date": close_time,
            "pair": deal.symbol,
            "market": "Forex", 
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
        
        # 5. Cek duplikasi & Insert
        if not check_trade_exists(token, deal.position_id, deal.ticket):
            if insert_trade(token, trade_data):
                print(f"[+] Disinkronkan: {direction} {deal.volume} {deal.symbol} | PnL: ${pnl:.2f}")
                synced_count += 1
            else:
                print(f"[-] Gagal sinkronisasi {deal.position_id}")
        else:
            print(f"[-] Transaksi dilewati: Sudah ada di jurnal (Position ID: {deal.position_id})")

    print(f"\nSinkronisasi selesai! {synced_count} trade baru berhasil ditambahkan ke Jurnal.")
    mt5.shutdown()

if __name__ == "__main__":
    main()
