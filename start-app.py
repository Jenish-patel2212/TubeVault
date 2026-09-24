import os
import sys
import socket
import subprocess

root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root, "backend")
frontend_dir = os.path.join(root, "frontend")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

local_ip = get_local_ip()

print("===================================================")
print("  Starting TubeVault Backend and Frontend Servers  ")
print("===================================================")

if os.name == 'nt':
    subprocess.Popen(["cmd.exe", "/k", f"cd /d \"{backend_dir}\" && venv\\Scripts\\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"], creationflags=subprocess.CREATE_NEW_CONSOLE)
    subprocess.Popen(["cmd.exe", "/k", f"cd /d \"{frontend_dir}\" && npm run dev -- --host 0.0.0.0 --port 5173"], creationflags=subprocess.CREATE_NEW_CONSOLE)
else:
    subprocess.Popen(["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"], cwd=backend_dir)
    subprocess.Popen(["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"], cwd=frontend_dir)

print("\n===================================================")
print("  TubeVault is Ready for Laptop and Mobile Phone!  ")
print("===================================================")
print(f"Laptop Browser: http://localhost:5173")
print(f"Mobile Phone:   http://{local_ip}:5173")
print(f"(Open http://{local_ip}:5173 on your phone connected to the same Wi-Fi)")
print(f"Backend API:    http://localhost:8000/docs")
print("===================================================\n")
