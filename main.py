# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════════════════════
  RV MULTI-CDN TURBO SCANNER — PRODUCTION ANDROID EDITION (v8.5)
  Architecture: Pure Async Native Python Sockets | Thread-Safe Kivy UI Engine
  Optimized for: Android ARM64 / Buildozer CI/CD Compilation
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import ssl
import threading
from ipaddress import IPv4Network

from kivy.app import App
from kivy.lang import Builder
from kivy.uix.boxlayout import BoxLayout
from kivy.clock import Clock
from kivy.core.clipboard import Clipboard
from kivy.core.window import Window
from kivy.properties import StringProperty, NumericProperty, BooleanProperty

# ═══════════════════════════════════════════════════════════════════════════════
# KV PRODUCTION UI SPECIFICATION (Cyber Slate Theme #0B0F19 / #1E293B / #38BDF8)
# ═══════════════════════════════════════════════════════════════════════════════
KV_DESIGN = """
#:import Window kivy.core.window.Window

<HitCard>:
    orientation: 'vertical'
    size_hint_y: None
    height: '100dp'
    padding: ['14dp', '10dp', '14dp', '10dp']
    spacing: '4dp'
    canvas.before:
        Color:
            rgba: 0.12, 0.16, 0.23, 1
        RoundedRectangle:
            pos: self.pos
            size: self.size
            radius: [10, 10, 10, 10]
        Color:
            rgba: (0.22, 0.74, 0.97, 0.5) if root.cdn_text == 'CloudFront' else ((0.98, 0.8, 0.08, 0.5) if root.cdn_text == 'Cloudflare' else (0.3, 0.4, 0.5, 0.3))
        Line:
            rounded_rectangle: [self.x, self.y, self.width, self.height, 10]
            width: 1.2

    # Top Row: Target & CDN Tag & Copy Action
    BoxLayout:
        size_hint_y: None
        height: '24dp'
        spacing: '6dp'
        Label:
            text: '[b][color=facc15]' + root.target_text + '[/color][/b]'
            markup: True
            font_size: '14sp'
            size_hint_x: 0.55
            halign: 'left'
            valign: 'middle'
            text_size: self.size
            shorten: True
            shorten_from: 'right'
        Label:
            text: '[b][color=38bdf8]' + root.cdn_text + '[/color][/b]'
            markup: True
            font_size: '12sp'
            size_hint_x: 0.30
            halign: 'right'
            valign: 'middle'
            text_size: self.size
        Button:
            text: '📋'
            font_size: '11sp'
            size_hint_x: None
            width: '32dp'
            background_normal: ''
            background_color: 0.18, 0.24, 0.35, 1
            on_press: root.copy_card_details()

    # Middle Row: HTTP Status & Server Header
    BoxLayout:
        size_hint_y: None
        height: '22dp'
        spacing: '4dp'
        Label:
            text: '[color=10b981]Status: [/color][color=ffffff]' + root.status_text + '[/color]'
            markup: True
            font_size: '12sp'
            size_hint_x: 0.48
            halign: 'left'
            valign: 'middle'
            text_size: self.size
            shorten: True
        Label:
            text: '[color=94a3b8]Server: [/color][color=ffffff]' + root.server_text + '[/color]'
            markup: True
            font_size: '12sp'
            size_hint_x: 0.52
            halign: 'left'
            valign: 'middle'
            text_size: self.size
            shorten: True

    # Bottom Row: Via Header & Latency Indicator
    BoxLayout:
        size_hint_y: None
        height: '20dp'
        Label:
            text: '[color=64748b]Via: [/color][color=cbd5e1]' + root.via_text + '[/color]'
            markup: True
            font_size: '11sp'
            halign: 'left'
            valign: 'middle'
            text_size: self.size
            shorten: True


<MainLayout>:
    orientation: 'vertical'
    padding: ['12dp', '10dp', '12dp', '10dp']
    spacing: '8dp'
    canvas.before:
        Color:
            rgba: 0.043, 0.059, 0.098, 1
        Rectangle:
            pos: self.pos
            size: self.size

    # Top AppBar Header
    BoxLayout:
        size_hint_y: None
        height: '42dp'
        spacing: '8dp'
        Label:
            text: '[b][color=38bdf8]⚡ RV TURBO SCANNER[/color] [color=94a3b8]v8.5[/color][/b]'
            markup: True
            font_size: '17sp'
            halign: 'left'
            valign: 'middle'
            text_size: self.size
        BoxLayout:
            size_hint_x: None
            width: '105dp'
            padding: ['6dp', '4dp', '6dp', '4dp']
            canvas.before:
                Color:
                    rgba: (0.06, 0.35, 0.22, 0.8) if root.is_scanning else (0.1, 0.14, 0.2, 0.8)
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
                Color:
                    rgba: (0.1, 0.72, 0.51, 0.6) if root.is_scanning else (0.2, 0.28, 0.38, 0.4)
                Line:
                    rounded_rectangle: [self.x, self.y, self.width, self.height, 6]
                    width: 1
            Label:
                text: '[b][color=10b981]● 80 Workers[/color][/b]' if not root.is_scanning else '[b][color=34d399]● Scanning...[/color][/b]'
                markup: True
                font_size: '11sp'
                halign: 'center'
                valign: 'middle'
                text_size: self.size

    # Mode Selector Segmented Deck
    BoxLayout:
        size_hint_y: None
        height: '38dp'
        spacing: '8dp'
        Button:
            id: btn_mode_ip
            text: '🌐 IP Range Scan'
            background_normal: ''
            background_color: (0.01, 0.6, 0.9, 1) if root.mode == 'ip' else (0.12, 0.16, 0.23, 1)
            font_size: '13sp'
            bold: True
            on_press: root.set_mode('ip')
        Button:
            id: btn_mode_dom
            text: '🔍 Domain Recon'
            background_normal: ''
            background_color: (0.01, 0.6, 0.9, 1) if root.mode == 'domain' else (0.12, 0.16, 0.23, 1)
            font_size: '13sp'
            bold: True
            on_press: root.set_mode('domain')

    # Target Input Deck
    TextInput:
        id: target_input
        text: '100.21.127.0/24'
        hint_text: 'Enter IP Range / CIDR (e.g. 100.21.127.0/24)'
        multiline: False
        size_hint_y: None
        height: '46dp'
        font_size: '14sp'
        padding: ['12dp', '13dp', '12dp', '10dp']
        background_normal: ''
        background_color: 0.07, 0.10, 0.16, 1
        foreground_color: 1, 1, 1, 1
        cursor_color: 0.22, 0.74, 0.97, 1
        on_text_validate: root.toggle_scan()

    # Action Deck (Start Scan & Copy All Hits)
    BoxLayout:
        size_hint_y: None
        height: '44dp'
        spacing: '8dp'
        Button:
            id: btn_action
            text: 'Stop Scan' if root.is_scanning else 'Start Scan'
            background_normal: ''
            background_color: (0.85, 0.2, 0.2, 1) if root.is_scanning else (0.01, 0.52, 0.78, 1)
            font_size: '14sp'
            bold: True
            on_press: root.toggle_scan()
        Button:
            id: btn_copy
            text: 'Copy All Hits'
            background_normal: ''
            background_color: 0.06, 0.58, 0.38, 1
            font_size: '14sp'
            bold: True
            on_press: root.copy_all_hits()

    # Live Progress Bar
    ProgressBar:
        id: progress_bar
        max: 100
        value: root.progress_val
        size_hint_y: None
        height: '8dp'

    # HUD 4-Metrics Responsive Grid
    GridLayout:
        cols: 3
        size_hint_y: None
        height: '46dp'
        spacing: '6dp'

        # Card 1: Total
        BoxLayout:
            orientation: 'vertical'
            padding: ['6dp', '4dp', '6dp', '4dp']
            canvas.before:
                Color:
                    rgba: 0.07, 0.10, 0.16, 1
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
                Color:
                    rgba: 0.15, 0.22, 0.33, 0.5
                Line:
                    rounded_rectangle: [self.x, self.y, self.width, self.height, 6]
                    width: 1
            Label:
                text: '[color=94a3b8]Total Targets[/color]'
                markup: True
                font_size: '10sp'
            Label:
                text: '[b][color=f8fafc]' + str(root.total_count) + '[/color][/b]'
                markup: True
                font_size: '14sp'

        # Card 2: Scanned Done
        BoxLayout:
            orientation: 'vertical'
            padding: ['6dp', '4dp', '6dp', '4dp']
            canvas.before:
                Color:
                    rgba: 0.07, 0.10, 0.16, 1
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
                Color:
                    rgba: 0.15, 0.22, 0.33, 0.5
                Line:
                    rounded_rectangle: [self.x, self.y, self.width, self.height, 6]
                    width: 1
            Label:
                text: '[color=94a3b8]Scanned Done[/color]'
                markup: True
                font_size: '10sp'
            Label:
                text: '[b][color=38bdf8]' + str(root.done_count) + '[/color][/b]'
                markup: True
                font_size: '14sp'

        # Card 3: Verified Hits
        BoxLayout:
            orientation: 'vertical'
            padding: ['6dp', '4dp', '6dp', '4dp']
            canvas.before:
                Color:
                    rgba: (0.05, 0.2, 0.12, 1) if root.hits_count > 0 else (0.07, 0.10, 0.16, 1)
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
                Color:
                    rgba: (0.1, 0.72, 0.51, 0.6) if root.hits_count > 0 else (0.15, 0.22, 0.33, 0.5)
                Line:
                    rounded_rectangle: [self.x, self.y, self.width, self.height, 6]
                    width: 1
            Label:
                text: '[color=10b981]Verified Hits[/color]'
                markup: True
                font_size: '10sp'
            Label:
                text: '[b][color=10b981]' + str(root.hits_count) + '[/color][/b]'
                markup: True
                font_size: '14sp'

    # Live Feed Section Label
    BoxLayout:
        size_hint_y: None
        height: '22dp'
        Label:
            text: '[color=38bdf8]●[/color] [color=cbd5e1]Live Match Stream:[/color]'
            markup: True
            font_size: '12sp'
            halign: 'left'
            valign: 'middle'
            text_size: self.size
        Label:
            text: root.status_msg
            markup: True
            font_size: '11sp'
            color: 0.6, 0.7, 0.8, 1
            halign: 'right'
            valign: 'middle'
            text_size: self.size

    # Scrollable Live Cards Feed
    ScrollView:
        id: scroll_view
        do_scroll_x: False
        bar_width: '4dp'
        bar_color: [0.22, 0.74, 0.97, 0.8]
        bar_inactive_color: [0.15, 0.2, 0.3, 0.5]
        BoxLayout:
            id: cards_container
            orientation: 'vertical'
            size_hint_y: None
            height: self.minimum_height
            spacing: '8dp'
            padding: ['0dp', '4dp', '0dp', '8dp']
"""

# ═══════════════════════════════════════════════════════════════════════════════
# ENGINE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
DOMAINS = {
    "CloudFront": "newstatic.payu.in",
    "Cloudflare": "cloudflare.com"
}
AUTO_PORTS = [80, 443, 8080, 8443]
SSL_PORTS = {443, 8443, 2053, 2083, 2087, 2096}
WORKERS_COUNT = 80
SOCKET_TIMEOUT = 2.0

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


# ═══════════════════════════════════════════════════════════════════════════════
# UI CARD WIDGET
# ═══════════════════════════════════════════════════════════════════════════════
class HitCard(BoxLayout):
    target_text = StringProperty('')
    status_text = StringProperty('')
    server_text = StringProperty('')
    via_text = StringProperty('')
    cdn_text = StringProperty('')

    def copy_card_details(self):
        log_line = f"{self.target_text} | {self.status_text} | Server: {self.server_text} | Via: {self.via_text} | {self.cdn_text}"
        Clipboard.copy(log_line)


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CONTROLLER LAYOUT
# ═══════════════════════════════════════════════════════════════════════════════
class MainLayout(BoxLayout):
    is_scanning = BooleanProperty(False)
    mode = StringProperty('ip')
    total_count = NumericProperty(0)
    done_count = NumericProperty(0)
    hits_count = NumericProperty(0)
    progress_val = NumericProperty(0)
    status_msg = StringProperty('Ready')

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.hits_list = []
        self.lock = threading.Lock()
        self.active_loop = None

    def set_mode(self, mode_type):
        if self.is_scanning:
            return
        self.mode = mode_type
        if mode_type == "ip":
            self.ids.target_input.text = "100.21.127.0/24"
            self.ids.target_input.hint_text = "Enter IP Range / CIDR (e.g. 100.21.127.0/24)"
        else:
            self.ids.target_input.text = "jio.com"
            self.ids.target_input.hint_text = "Enter Domain (e.g. jio.com or api.payu.in)"

    def toggle_scan(self):
        if not self.is_scanning:
            target = self.ids.target_input.text.strip()
            if not target:
                self.status_msg = "[color=f87171]Error: Empty target[/color]"
                return

            self.is_scanning = True
            self.ids.cards_container.clear_widgets()
            self.hits_list = []
            self.done_count = 0
            self.total_count = 0
            self.hits_count = 0
            self.progress_val = 0
            self.status_msg = "Initializing workers..."

            threading.Thread(target=self._run_async_worker, args=(target,), daemon=True).start()
        else:
            self.is_scanning = False
            self.status_msg = "Stopping scan..."

    def _run_async_worker(self, target):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self.active_loop = loop
        try:
            if self.mode == "ip":
                loop.run_until_complete(self.run_ip_scan(target))
            else:
                loop.run_until_complete(self.run_domain_scan(target))
        finally:
            loop.close()
            self.active_loop = None

    def update_hud(self):
        def _hud(dt):
            if self.total_count > 0:
                self.progress_val = (self.done_count / self.total_count) * 100.0
            else:
                self.progress_val = 0.0
        Clock.schedule_once(_hud)

    def add_hit_card(self, target, status, server, via, cdn):
        def _add(dt):
            card = HitCard(
                target_text=target,
                status_text=status,
                server_text=server,
                via_text=via,
                cdn_text=cdn
            )
            self.ids.cards_container.add_widget(card)
        Clock.schedule_once(_add)

    # ═══════════════════════════════════════════════════════════════════════════
    # NATIVE ASYNC SOCKET ENGINE
    # ═══════════════════════════════════════════════════════════════════════════
    async def raw_http_probe(self, ip, domain, port):
        is_ssl = port in SSL_PORTS
        req = (
            f"HEAD / HTTP/1.1\r\n"
            f"Host: {domain}\r\n"
            f"User-Agent: Mozilla/5.0 (RV-Scanner/8.5)\r\n"
            f"Accept: */*\r\n"
            f"Connection: close\r\n\r\n"
        ).encode('utf-8')

        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(
                    host=ip,
                    port=port,
                    ssl=ssl_ctx if is_ssl else None,
                    server_hostname=domain if is_ssl else None
                ),
                timeout=SOCKET_TIMEOUT
            )
            writer.write(req)
            await writer.drain()

            raw_data = await asyncio.wait_for(reader.read(1500), timeout=SOCKET_TIMEOUT)
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

            if not raw_data:
                return None

            text = raw_data.decode('latin-1', errors='ignore')
            lines = text.split('\r\n')
            status_line = lines[0] if lines else ""

            server_h, via_h = "", ""
            for line in lines:
                lower = line.lower()
                if lower.startswith("server:"):
                    server_h = line[7:].strip()
                elif lower.startswith("via:"):
                    via_h = line[4:].strip()

            # Fake ISP 302 Filter
            if not server_h and not via_h:
                return None

            clean_status = status_line.replace("HTTP/1.1 ", "").replace("HTTP/2 ", "").replace("HTTP/1.0 ", "").strip()
            return {
                "status": clean_status if clean_status else "200 OK",
                "server": server_h if server_h else "Unknown",
                "via": via_h if via_h else "None"
            }
        except Exception:
            return None

    async def scan_single_target(self, ip, port, seen_targets):
        if not self.is_scanning:
            return
        target_key = f"{ip}:{port}"
        if target_key in seen_targets:
            return

        tasks = [
            self.raw_http_probe(ip, DOMAINS["CloudFront"], port),
            self.raw_http_probe(ip, DOMAINS["Cloudflare"], port)
        ]
        cf_res, cl_res = await asyncio.gather(*tasks)
        res = cf_res or cl_res
        cdn_type = "CloudFront" if cf_res else ("Cloudflare" if cl_res else "Edge Match")

        if res and self.is_scanning:
            if target_key not in seen_targets:
                seen_targets.add(target_key)
                with self.lock:
                    self.hits_count += 1
                    srv = res["server"]
                    via = res["via"]
                    st = res["status"]
                    log_entry = f"{target_key} | {st} | Server: {srv} | Via: {via} | {cdn_type}"
                    self.hits_list.append(log_entry)
                    self.add_hit_card(target_key, st, srv, via, cdn_type)

    async def worker_consumer(self, queue, seen_targets):
        while True:
            try:
                ip = await queue.get()
            except asyncio.CancelledError:
                break
            if ip is None:
                queue.task_done()
                break

            if self.is_scanning:
                port_tasks = [self.scan_single_target(ip, p, seen_targets) for p in AUTO_PORTS]
                await asyncio.gather(*port_tasks)

            with self.lock:
                self.done_count += 1
                self.update_hud()
            queue.task_done()

    async def run_ip_scan(self, target):
        ips = []
        try:
            if '-' in target and '/' not in target:
                base, end_p = target.split('-')
                start_num = int(base.split('.')[-1])
                end_num = int(end_p)
                base_ip = '.'.join(base.split('.')[:3])
                ips = [f"{base_ip}.{i}" for i in range(start_num, end_num + 1)]
            elif '/' in target:
                net = IPv4Network(target, strict=False)
                ips = [str(ip) for ip in (net if net.prefixlen >= 31 else net.hosts())]
            else:
                ips = [target]
        except Exception:
            def _err(dt):
                self.status_msg = "[color=f87171]Invalid Range/CIDR[/color]"
                self.is_scanning = False
            Clock.schedule_once(_err)
            return

        self.total_count = len(ips)
        self.update_hud()

        def _scanning(dt):
            self.status_msg = f"Scanning {self.total_count} IPs..."
        Clock.schedule_once(_scanning)

        seen_targets = set()
        queue = asyncio.Queue(maxsize=300)
        workers = [asyncio.create_task(self.worker_consumer(queue, seen_targets)) for _ in range(WORKERS_COUNT)]

        for ip in ips:
            if not self.is_scanning:
                break
            await queue.put(ip)

        await queue.join()
        for _ in range(WORKERS_COUNT):
            await queue.put(None)
        await asyncio.gather(*workers, return_exceptions=True)

        def _finish(dt):
            self.is_scanning = False
            self.status_msg = f"Completed ({self.hits_count} hits)"
        Clock.schedule_once(_finish)

    async def run_domain_scan(self, domain):
        clean = domain.replace("https://", "").replace("http://", "").split('/')[0].strip()
        self.total_count = 1
        self.done_count = 0
        self.update_hud()

        def _probing(dt):
            self.status_msg = f"Probing {clean}..."
        Clock.schedule_once(_probing)

        res = await self.raw_http_probe(clean, clean, 443) or await self.raw_http_probe(clean, clean, 80)
        self.done_count = 1
        self.update_hud()

        if res:
            self.hits_count = 1
            log_str = f"{clean} | {res['status']} | Server: {res['server']} | Via: {res['via']} | CDN Match"
            self.hits_list.append(log_str)
            self.add_hit_card(clean, res['status'], res['server'], res['via'], "CDN Match")
            def _found(dt):
                self.status_msg = "Domain Verified!"
                self.is_scanning = False
            Clock.schedule_once(_found)
        else:
            def _none(dt):
                self.status_msg = "No CDN match found"
                self.is_scanning = False
            Clock.schedule_once(_none)

    def copy_all_hits(self):
        if not self.hits_list:
            self.status_msg = "No hits to copy"
            return
        Clipboard.copy("\n".join(self.hits_list))
        self.status_msg = f"Copied {len(self.hits_list)} hits!"


# ═══════════════════════════════════════════════════════════════════════════════
# APP RUNNER
# ═══════════════════════════════════════════════════════════════════════════════
class RVTurboScannerApp(App):
    title = "RV Turbo Scanner v8.5"

    def build(self):
        Builder.load_string(KV_DESIGN)
        return MainLayout()


if __name__ == '__main__':
    RVTurboScannerApp().run()
