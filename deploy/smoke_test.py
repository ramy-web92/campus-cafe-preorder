"""Read-only checks of the live service after a deploy. Credentials are never printed.

Called by .github/workflows/deploy.yml:   python3 deploy/smoke_test.py SERVICE_URL
Exits non-zero (failing the workflow) if a check fails. Each public check is retried
up to 5 times, 3 seconds apart, to tolerate Cloud Run cold starts.

Checks (KMUTT Café Pre-Order)
  1. GET /api/health                  -> {"status": "ok"}
  2. GET /api/ready                   -> {"db": "connected"}   (the database works)
  3. GET /                            -> HTML page              (the built React app is served)
  4. GET /api/menu without a session  -> 401                    (backend access control is live)
  5. OPTIONAL login with a demo account: login, /api/menu (non-empty: migration + seed
     worked), logout. Runs only if BOTH SMOKE_EMAIL and SMOKE_PASSWORD are set.
     The app uses a session cookie, so a cookie jar keeps the session between calls.
     The session is always logged out, even if a check fails.

Standard library only. Offline unit tests: deploy/tests/test_smoke.py
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def request(base, path, data=None, opener=None):
    """Returns the response body (bytes). Raises on HTTP errors and timeouts."""
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(data).encode() if data is not None else None)
    with (opener or urllib.request.build_opener()).open(req, timeout=30) as response:
        return response.read()


def status(base, path):
    """Returns the HTTP status code of a GET (does not raise on 4xx/5xx)."""
    try:
        with urllib.request.urlopen(base + path, timeout=30) as response:
            return response.status
    except urllib.error.HTTPError as err:
        return err.code


def check(base):
    public = (
        ('/api/health', lambda: json.loads(request(base, '/api/health')).get('status') == 'ok'),
        ('/api/ready', lambda: json.loads(request(base, '/api/ready')).get('db') == 'connected'),
        ('/', lambda: b'<html' in request(base, '/').lower()),
        ('/api/menu (anonymous -> 401)', lambda: status(base, '/api/menu') == 401),
    )
    for name, ok in public:
        for attempt in range(5):
            try:
                if not ok():
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + name) from None
                time.sleep(3)
        print('PASS ' + name)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    logged_in = False
    try:
        request(base, '/api/auth/login', {'email': email, 'password': password}, opener=opener)
        logged_in = True
        menu = json.loads(request(base, '/api/menu', opener=opener))
        if not menu.get('categories'):
            raise ValueError('Empty menu')
        print('PASS login and authenticated /api/menu (seeded data present)')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(base, '/api/auth/logout', data={}, opener=opener)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
