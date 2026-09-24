========================================================================
   TUBEVAULT - DIRECT NETLIFY DEPLOYMENT FOLDER
========================================================================

Aap is poore "netlify-deploy" folder ko direct Netlify par upload kar sakte hain!

------------------------------------------------------------------------
STEP 1: NETLIFY PAR UPLOAD KAISE KAREIN (30 SECONDS)
------------------------------------------------------------------------
1. Browser me yeh link kholein:
   👉 https://app.netlify.com/drop
   (Agar Netlify account nahi hai to free me sign in / sign up kar lein)

2. Is "netlify-deploy" folder ko drag karein aur Netlify Drop box me chhod dein (Drop karein).

3. 5 seconds me aapki website live ho jayegi aur aapko ek link mil jayega:
   https://your-site-name.netlify.app

------------------------------------------------------------------------
STEP 2: BACKEND SERVER SE KAISE CONNECT KAREIN
------------------------------------------------------------------------
Kyunki Netlify sirf Frontend (HTML/CSS/JS) host karta hai, Python server nahi,
aapke paas Backend chalane ke 2 sabse aasan tarike hain:

Tarika A (Cloudflare Tunnel - Apne Laptop Se):
1. Apne laptop me "start-online.bat" run karein.
2. Usme ek link aayega (e.g. https://xxxx.trycloudflare.com).
3. Apni Netlify website kholein, upar "Server" button par click karein.
4. Apna link paste karke "Save & Connect" click karein!
   Website seedha aapke server se connect ho jayegi!

Tarika B (24/7 Free Cloud Hosting - Render.com):
1. Render.com par backend deploy karein (DEPLOYMENT_GUIDE.md dekhein).
2. Render se aapko URL milega (e.g. https://tubevault-backend.onrender.com).
3. Ya to "config.js" file me window.TUBEVAULT_BACKEND_URL me paste kar dein,
   ya phir website me "Server" button par click karke save kar dein.

------------------------------------------------------------------------
KABHI CODE UPDATE KARNA HO TO:
------------------------------------------------------------------------
Root folder me "build-netlify.bat" par double click karein.
Yeh automatic fresh code build karke is folder ko update kar dega!
========================================================================
