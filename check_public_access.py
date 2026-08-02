import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

url = f"{SUPABASE_URL}/rest/v1/trades?limit=1"
req = urllib.request.Request(url, method='GET')
req.add_header('apikey', SUPABASE_KEY)
# NO Authorization header (Simulating public access)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print(f"Public fetch success. Rows returned: {len(res)}")
except Exception as e:
    print(f"Public fetch failed: {e}")
