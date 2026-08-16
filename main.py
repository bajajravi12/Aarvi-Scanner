# -*- coding: utf-8 -*-
"""
═══════════════════════════════════════════════════════════════
  RV MULTI-CDN TURBO SCANNER — FULL TXT & HUD EDITION v8.7
  IP Range | TXT File Auto-Finder | Domain Recon | 80 Workers
═══════════════════════════════════════════════════════════════
"""

import os
import asyncio
import ssl
import threading
from ipaddress import IPv4Network

from kivy.app import App
from kivy.lang import Builder
from kivy.uix.boxlayout import BoxLayout
from kivy.clock import Clock
from kivy.core.clipboard import Clipboard
from kivy.utils import platform

KV_DESIGN = """
<HitCard@BoxLayout>:
    orientation: 'vertical'
    size_hint_y: None
    height: '92dp'
    padding: ['12dp', '8dp', '12dp', '8dp']
    spacing: '4dp'
    canvas.before:
        Color:
            rgba: 0.12, 0.16, 0.23, 1
        RoundedRectangle:
            pos: self.pos
            size: self.size
            radius: [8, 8, 8, 8]
        Color:
            rgba: 0.22, 0.74, 0.97, 0.4
        Line:
            rounded_rectangle: [self.x, self.y, self.width, self.height, 8]
            width: 1

    target_text: ''
    status_text: ''
    server_text: ''
    via_text: ''
    cdn_text: ''

    BoxLayout:
        size_hint_y: None
        height: '24dp'
        Label:
            text: '[b][color=facc15]' + root.target_text + '[/color][/b]'
            markup: True
            font_size: '14sp'
            size_hint_x: 0.65
            halign: 'left'
            text_size: self.size
        Label:
            text: '[b][color=38bdf8]' + root.cdn_text + '[/color][/b]'
            markup: True
            font_size: '12sp'
            size_hint_x: 0.35
            halign: 'right'
            text_size: self.size

    BoxLayout:
        size_hint_y: None
        height: '22dp'
        Label:
            text: '[color=10b981]Status: [/color]' + root.status_text
            markup: True
            font_size: '12sp'
            size_hint_x: 0.5
            halign: 'left'
            text_size: self.size
        Label:
            text: '[color=94a3b8]Server: [/color][color=ffffff]' + root.server_text + '[/color]'
            markup: True
            font_size: '12sp'
            size_hint_x: 0.5
            halign: 'left'
            text_size: self.size

    Label:
        text: '[color=64748b]Via: [/color]' + root.via_text
        markup: True
        font_size: '11sp'
        size_hint_y: None
        height: '18dp'
        halign: 'left'
        text_size: self.size

<MainLayout>:
    orientation: 'vertical'
    padding: ['12dp', '10dp', '12dp', '10dp']
    spacing: '8dp'
    canvas.before:
        Color:
            rgba: 0.04, 0.06, 0.10, 1
        Rectangle:
            pos: self.pos
            size: self.size

    # Header
    BoxLayout:
        size_hint_y: None
        height: '38dp'
        Label:
            text: '[b][color=38bdf8]⚡ RV TURBO SCANNER[/color] [color=94a3b8]v8.7[/color][/b]'
            markup: True
            font_size: '18sp'
            halign: 'left'
            text_size: self.size
        Label:
            text: '[b][color=10b981]● 80 Workers[/color][/b]'
            markup: True
            font_size: '12sp'
            size_hint_x: None
            width: '90dp'

    # 3-Mode Selector (IP, TXT, Domain)
    BoxLayout:
        size_hint_y: None
        height: '36dp'
        spacing: '6dp'
        Button:
            id: btn_mode_ip
            text: 'IP Range'
            background_normal: ''
            background_color: 0.02, 0.6, 0.9, 1
            font_size: '12sp'
            bold: True
            on_press: root.set_mode('ip')
        Button:
            id: btn_mode_txt
            text: 'TXT File'
            background_normal: ''
            background_color: 0.12, 0.16, 0.23, 1
            font_size: '12sp'
            on_press: root.set_mode('txt')
        Button:
            id: btn_mode_dom
            text: 'Domain'
            background_normal: ''
            background_color: 0.12, 0.16, 0.23, 1
            font_size: '12sp'
            on_press: root.set_mode('domain')

    # Input Box with Clear (X) Button
    BoxLayout:
        size_hint_y: None
        height: '46dp'
        spacing: '6dp'
        TextInput:
            id: target_input
            text: ''
            hint_text: 'Type IP Range (e.g. 100.21.127.0/24)'
            multiline: False
            font_size: '14sp'
            padding: ['10dp', '12dp', '10dp', '12dp']
            background_normal: ''
            background_color: 0.08, 0.11, 0.18, 1
            foreground_color: 1, 1, 1, 1
            cursor_color: 0.22, 0.74, 0.97, 1
            use_bubble: True
            use_handles: True
        Button:
            text: '✕ Clear'
            size_hint_x: None
            width: '75dp'
            background_normal: ''
            background_color: 0.25, 0.15, 0.18, 1
            font_size: '13sp'
            bold: True
            on_press: root.clear_input()

    # Action Buttons
    BoxLayout:
        size_hint_y: None
        height: '42dp'
        spacing: '8dp'
        Button:
            id: btn_action
            text: 'Start Scan'
            background_normal: ''
            background_color: 0.01, 0.52, 0.78, 1
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

    # Progress Bar
    ProgressBar:
        id: progress_bar
        max: 100
        value: 0
        size_hint_y: None
        height: '8dp'

    # HUD Metrics
    GridLayout:
        cols: 3
        size_hint_y: None
        height: '44dp'
        spacing: '6dp'
        BoxLayout:
            canvas.before:
                Color:
                    rgba: 0.08, 0.11, 0.18, 1
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
            Label:
                id: lbl_total
                text: '[color=94a3b8]Total: [/color][b]0[/b]'
                markup: True
                font_size: '12sp'

        BoxLayout:
            canvas.before:
                Color:
                    rgba: 0.08, 0.11, 0.18, 1
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
            Label:
                id: lbl_done
                text: '[color=94a3b8]Done: [/color][b]0[/b]'
                markup: True
                font_size: '12sp'

        BoxLayout:
            canvas.before:
                Color:
                    rgba: 0.08, 0.11, 0.18, 1
                RoundedRectangle:
                    pos: self.pos
                    size: self.size
                    radius: [6, 6, 6, 6]
            Label:
                id: lbl_hits
                text: '[color=10b981]Hits: [/color][b]0[/b]'
                markup: True
                font_size: '12sp'

    # Matches Feed Header
    Label:
        id: status_title
        text: 'Live Matches Feed:'
        size_hint_y: None
        height: '20dp'
        font_size: '12sp'
        color: 0.58, 0.64, 0.72, 1
        halign: 'left'
        text_size: self.size

    ScrollView:
        id: scroll_view
        do_scroll_x: False
        BoxLayout:
            id: cards_container
            orientation: 'vertical'
            size_hint_y: None
            height: self.minimum_height
            spacing: '8dp'
"""

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


def find_file_anywhere(filename):
    filename = filename.strip()
    filename_txt = filename if filename.endswith('.txt') else filename + '.txt'

    if os.path.exists(filename): return os.path.abspath(filename)
    if os.path.exists(filename_txt): return os.path.abspath(filename_txt)

    search_dirs = [
        "/sdcard",
        "/sdcard/Download",
        "/sdcard/Documents",
        "/storage/emulated/0",
        "/storage/emulated/0/Download",
        "/storage/emulated/0/Documents",
        os.getcwd(),
        os.path.expanduser("~")
    ]

    for d in search_dirs:
        if os.path.exists(d):
            p1, p2 = os.path.join(d, filename), os.path.join(d, filename_txt)
            if os.path.exists(p1): return p1
            if os.path.exists(p2): return p2

    for r in ["/sdcard", "/storage/emulated/0", os.path.expanduser("~")]:
        if not os.path.exists(r): continue
        for root, dirs, files in os.walk(r):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('Android', 'data')]
            if filename in files: return os.path.join(root, filename)
            if filename_txt in files: return os.path.join(root, filename_txt)

    return None


def parse_txt_file(filepath):
    items = []
    try:
        with open(filepath, 'r', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                for part in line.split(','):
                    p = part.strip()
                    if p: items.append(p)
    except Exception:
        return []
    return items


def expand_ips(entries):
    for entry in entries:
        try:
            entry = entry.strip()
            if not entry: continue
            if '-' in entry and '/' not in entry:
                base, end_p = entry.split('-')
                start_num, end_num = int(base.split('.')[-1]), int(end_p)
                base_ip = '.'.join(base.split('.')[:3])
                for i in range(start_num, end_num + 1):
                    yield f"{base_ip}.{i}"
            elif '/' in entry:
                net = IPv4Network(entry, strict=False)
                if net.prefixlen >= 31:
                    for ip in net: yield str(ip)
                else:
                    for ip in net.hosts(): yield str(ip)
            else:
                yield entry
        except Exception:
            continue


class MainLayout(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.is_scanning = False
        self.mode = "ip"
        self.hits_list = []
        self.done_count = 0
        self.total_count = 0
        self.hits_count = 0
        self.lock = threading.Lock()

    def clear_input(self):
        self.ids.target_input.text = ''
        self.ids.target_input.focus = True

    def set_mode(self, mode_type):
        if self.is_scanning: return
        self.mode = mode_type
        self.ids.target_input.text = ''

        # Button Colors
        self.ids.btn_mode_ip.background_color = (0.12, 0.16, 0.23, 1)
        self.ids.btn_mode_txt.background_color = (0.12, 0.16, 0.23, 1)
        self.ids.btn_mode_dom.background_color = (0.12, 0.16, 0.23, 1)

        if mode_type == "ip":
            self.ids.btn_mode_ip.background_color = (0.02, 0.6, 0.9, 1)
            self.ids.target_input.hint_text = "Type IP Range (e.g. 100.21.127.0/24)"
            self.ids.status_title.text = "Mode: IP Range Scan"
        elif mode_type == "txt":
            self.ids.btn_mode_txt.background_color = (0.02, 0.6, 0.9, 1)
            self.ids.target_input.hint_text = "Enter TXT file name (e.g. ips.txt or domains.txt)"
            self.ids.status_title.text = "Mode: Auto TXT File Scanner"
        else:
            self.ids.btn_mode_dom.background_color = (0.02, 0.6, 0.9, 1)
            self.ids.target_input.hint_text = "Type Domain (e.g. api.jio.com)"
            self.ids.status_title.text = "Mode: Domain Recon"

    def toggle_scan(self):
        if not self.is_scanning:
            target = self.ids.target_input.text.strip()
            if not target:
                self.ids.status_title.text = "Error: Please enter a target/file name!"
                return

            self.is_scanning = True
            self.ids.btn_action.text = "Stop Scan"
            self.ids.btn_action.background_color = (0.85, 0.2, 0.2, 1)
            self.ids.cards_container.clear_widgets()
            self.hits_list = []
            self.done_count = 0
            self.total_count = 0
            self.hits_count = 0
            self.ids.status_title.text = "Scanning in progress..."

            threading.Thread(target=self._run_async_thread, args=(target,), daemon=True).start()
        else:
            self.is_scanning = False
            self._reset_ui_state()
            self.ids.status_title.text = "Scan stopped by user."

    def _reset_ui_state(self):
        def _reset(dt):
            self.is_scanning = False
            self.ids.btn_action.text = "Start Scan"
            self.ids.btn_action.background_color = (0.01, 0.52, 0.78, 1)
        Clock.schedule_once(_reset)

    def _run_async_thread(self, target):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        if self.mode == "ip":
            loop.run_until_complete(self.run_ip_scan([target]))
        elif self.mode == "txt":
            loop.run_until_complete(self.run_txt_scan(target))
        else:
            loop.run_until_complete(self.run_domain_scan(target))
        loop.close()

    def update_hud(self):
        def _hud(dt):
            if self.total_count > 0:
                pct = (self.done_count / self.total_count) * 100
                self.ids.progress_bar.value = pct
            self.ids.lbl_total.text = f"[color=94a3b8]Total: [/color][b]{self.total_count}[/b]"
            self.ids.lbl_done.text = f"[color=94a3b8]Done: [/color][b]{self.done_count}[/b]"
            self.ids.lbl_hits.text = f"[color=10b981]Hits: [/color][b]{self.hits_count}[/b]"
        Clock.schedule_once(_hud)

    def add_hit_card(self, target, status, server, via, cdn):
        def _add(dt):
            card = Builder.template(
                'HitCard',
                target_text=target,
                status_text=status,
                server_text=server,
                via_text=via,
                cdn_text=cdn
            )
            self.ids.cards_container.add_widget(card)
        Clock.schedule_once(_add)

    # ═══════════════════════════════════════════════════════════════
    # SCAN ENGINE CORE
    # ═══════════════════════════════════════════════════════════════
    async def raw_http_probe(self, ip, domain, port):
        is_ssl = port in SSL_PORTS
        req = (
            f"HEAD / HTTP/1.1\r\n"
            f"Host: {domain}\r\n"
            f"User-Agent: Mozilla/5.0 (RV-Scanner/8.7)\r\n"
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

            if not raw_data: return None

            text = raw_data.decode('latin-1', errors='ignore')
            lines = text.split('\r\n')
            status_line = lines[0] if lines else ""

            server_h, via_h = "", ""
            for line in lines:
                lower = line.lower()
                if lower.startswith("server:"): server_h = line[7:].strip()
                elif lower.startswith("via:"): via_h = line[4:].strip()

            if not server_h and not via_h: return None

            return {
                "status": status_line.replace("HTTP/1.1 ", "").replace("HTTP/2 ", "").replace("HTTP/1.0 ", "").strip(),
                "server": server_h if server_h else "Unknown",
                "via": via_h if via_h else "None"
            }
        except Exception:
            return None

    async def scan_single_target(self, ip, port, seen_targets):
        if not self.is_scanning: return
        target_key = f"{ip}:{port}"
        if target_key in seen_targets: return

        tasks = [
            self.raw_http_probe(ip, DOMAINS["CloudFront"], port),
            self.raw_http_probe(ip, DOMAINS["Cloudflare"], port)
        ]
        cf_res, cl_res = await asyncio.gather(*tasks)
        res = cf_res or cl_res
        cdn_type = "CloudFront" if cf_res else ("Cloudflare" if cl_res else "")

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

    async def run_ip_scan(self, entries):
        ips = list(expand_ips(entries))
        if not ips:
            self.ids.status_title.text = "Error: No valid IP parsed!"
            self._reset_ui_state()
            return

        self.total_count = len(ips)
        self.update_hud()

        seen_targets = set()
        queue = asyncio.Queue(maxsize=300)
        workers = [asyncio.create_task(self.worker_consumer(queue, seen_targets)) for _ in range(WORKERS_COUNT)]

        for ip in ips:
            if not self.is_scanning: break
            await queue.put(ip)

        await queue.join()
        for _ in range(WORKERS_COUNT):
            await queue.put(None)
        await asyncio.gather(*workers, return_exceptions=True)

        self.ids.status_title.text = f"Scan Completed! Verified Hits: {self.hits_count}"
        self._reset_ui_state()

    async def run_txt_scan(self, filename):
        path = find_file_anywhere(filename)
        if not path:
            self.ids.status_title.text = f"File '{filename}' not found in storage!"
            self._reset_ui_state()
            return

        entries = parse_txt_file(path)
        if not entries:
            self.ids.status_title.text = "File is empty!"
            self._reset_ui_state()
            return

        # Check if file contains domains or IPs
        if any('.' in e and not e.replace('.', '').replace('/', '').replace('-', '').isdigit() for e in entries):
            # Domain list in TXT
            self.total_count = len(entries)
            self.update_hud()
            sem = asyncio.Semaphore(WORKERS_COUNT)

            async def probe_d(dom):
                clean = dom.replace("https://", "").replace("http://", "").split('/')[0].strip()
                if clean and self.is_scanning:
                    res = await self.raw_http_probe(clean, clean, 443) or await self.raw_http_probe(clean, clean, 80)
                    if res:
                        with self.lock:
                            self.hits_count += 1
                            self.hits_list.append(f"{clean} | {res['status']} | Server: {res['server']} | Via: {res['via']}")
                            self.add_hit_card(clean, res['status'], res['server'], res['via'], "CDN Match")
                with self.lock:
                    self.done_count += 1
                    self.update_hud()

            await asyncio.gather(*(probe_d(d) for d in entries), return_exceptions=True)
            self.ids.status_title.text = f"TXT Domain Scan Finished! Hits: {self.hits_count}"
            self._reset_ui_state()
        else:
            # IP list in TXT
            await self.run_ip_scan(entries)

    async def run_domain_scan(self, domain):
        clean = domain.replace("https://", "").replace("http://", "").split('/')[0].strip()
        self.total_count = 1
        self.update_hud()
        self.ids.status_title.text = f"Probing {clean}..."

        res = await self.raw_http_probe(clean, clean, 443) or await self.raw_http_probe(clean, clean, 80)
        self.done_count = 1
        self.update_hud()

        if res:
            self.hits_count = 1
            log_str = f"{clean} | {res['status']} | Server: {res['server']} | Via: {res['via']}"
            self.hits_list.append(log_str)
            self.add_hit_card(clean, res['status'], res['server'], res['via'], "CDN Match")
            self.ids.status_title.text = "Domain Verified!"
        else:
            self.ids.status_title.text = "No verified CDN response found."

        self.update_hud()
        self._reset_ui_state()

    def copy_all_hits(self):
        if not self.hits_list:
            self.ids.status_title.text = "No hits to copy!"
            return
        Clipboard.copy("\n".join(self.hits_list))
        self.ids.status_title.text = f"Copied {len(self.hits_list)} hits to clipboard!"


class RVTurboScannerApp(App):
    def build(self):
        # Request Android Storage Permissions
        if platform == 'android':
            try:
                from android.permissions import request_permissions, Permission
                request_permissions([
                    Permission.READ_EXTERNAL_STORAGE,
                    Permission.WRITE_EXTERNAL_STORAGE,
                    Permission.INTERNET
                ])
            except Exception:
                pass

        Builder.load_string(KV_DESIGN)
        return MainLayout()


if __name__ == '__main__':
    RVTurboScannerApp().run()
