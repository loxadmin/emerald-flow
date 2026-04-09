from playwright.sync_api import sync_playwright
import os
import time

def run_cuj(page):
    # Wait for server
    for _ in range(10):
        try:
            page.goto("http://localhost:8081", wait_until="networkidle")
            break
        except:
            time.sleep(2)

    page.wait_for_timeout(2000)

    variants = ["default", "variant1", "variant2", "variant3", "variant4", "variant5"]

    for variant in variants:
        url = f"http://localhost:8081?variant={variant}" if variant != "default" else "http://localhost:8081"
        print(f"Capturing screenshot for: {variant}")
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)
        page.screenshot(path=f"verification/screenshots/landing_{variant}.png", full_page=True)
        print(f"Screenshot saved to verification/screenshots/landing_{variant}.png")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
