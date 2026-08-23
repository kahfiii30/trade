@echo off
title MT5 Realtime Continuous Live Bridge - Trade Hitoshi
cls
echo ===================================================================
echo     TRADE HITOSHI - MT5 CONTINUOUS REALTIME LIVE BRIDGE
echo ===================================================================
echo  Status: Menghubungkan ke MetaTrader 5 dan Supabase Cloud...
echo  Interval: Otomatis sinkronisasi setiap 15 detik.
echo  Info: Tekan tombol [Ctrl + C] di keyboard jika ingin menghentikan.
echo ===================================================================
echo.
python -u "%~dp0mt5_sync.py" --watch
pause
