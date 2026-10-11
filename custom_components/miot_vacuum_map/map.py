"""Map fetching, decryption and decoding, independent of Miot's source files."""
import asyncio
import base64
import hashlib
import json
import re
import struct as _struct
import time
import zlib
from abc import ABC, abstractmethod
from aiohttp import ClientTimeout
from yarl import URL
from Crypto.Cipher import AES


class VacuumMapProvider(ABC):
    """Backend source of renderable vacuum maps."""

    @abstractmethod
    async def async_get_map(self, map_type=0, include_map_data=True, force=False):
        """Return parsed map data for frontend rendering."""


class MiotVacuumMapProvider(VacuumMapProvider):
    def __init__(self, vacuum):
        self._vacuum = vacuum
        self._parser = None
        self._parser_key = None
        self._last_fetch = 0
        self._last_map_type = None
        self._last_data = None
        self._lock = asyncio.Lock()

    async def async_get_map(self, map_type=0, include_map_data=True, force=False):
        async with self._lock:
            now = time.monotonic()
            if (
                not force
                and self._last_data
                and self._last_map_type == map_type
                and now - self._last_fetch < 2
            ):
                return self._filtered_map(include_map_data)
            parser = self._get_parser()
            pb = await parser.fetch_map(map_type=map_type)
            if not pb:
                raise RuntimeError('Map file URL is empty or map payload is unavailable')
            data = parser.parse(pb)
            if not data:
                raise RuntimeError('Map payload could not be parsed')
            data.update({
                'entity_id': self._vacuum.entity_id,
                'map_type': map_type,
                'fetched_at': int(time.time()),
                'mapDataEncoding': 'base64:int8',
            })
            self._last_data = data
            self._last_map_type = map_type
            self._last_fetch = now
            return self._filtered_map(include_map_data)

    def _filtered_map(self, include_map_data):
        data = dict(self._last_data or {})
        if not include_map_data:
            data.pop('mapData', None)
        return data

    def match_entity_id(self, entity_id):
        return entity_id in {
            self._vacuum.entity_id,
            getattr(self._vacuum, 'entity_id', ''),
        }

    def _get_parser(self):
        cloud = self._vacuum.xiaomi_cloud
        mac = getattr(self._vacuum.device.info, 'mac', None)
        did = str(self._vacuum.miot_did or '')
        sn = self._get_serial_number()
        if not cloud or not getattr(cloud, 'user_id', None):
            raise RuntimeError('Xiaomi cloud is unavailable')
        if not mac or not did:
            raise RuntimeError('Vacuum MAC or DID is unavailable')
        if not sn:
            raise RuntimeError('Vacuum serial number is unavailable')
        key = (id(cloud), mac, self._vacuum._model, sn, cloud.user_id, did)
        if self._parser is None or self._parser_key != key:
            self._parser = VacuumMapParser(cloud, mac, self._vacuum._model, sn, cloud.user_id, did)
            self._parser_key = key
        return self._parser

    def _get_serial_number(self):
        for key in ('sn', 'serial_number', 'miot_sn', 'vacuum_sn'):
            val = self._vacuum.custom_config(key)
            if val:
                return str(val)
        for attrs in (self._vacuum._state_attrs, getattr(self._vacuum.device, 'props', None)):
            if not isinstance(attrs, dict):
                continue
            if sn := self._extract_sn_from_multi_prop(attrs.get('sweep.multi_prop_vacuum')):
                return sn
        info = getattr(self._vacuum.device, 'info', None)
        for attr in ('sn', 'serial_number'):
            val = getattr(info, attr, None)
            if val:
                return str(val)
        miio_info = getattr(info, 'miio_info', None) if info else None
        if isinstance(miio_info, dict):
            for key in ('sn', 'serial_number', 'serialNumber'):
                if miio_info.get(key):
                    return str(miio_info[key])
        hass = getattr(self._vacuum, 'hass', None)
        mac = getattr(info, 'mac', None) if info else None
        if not hass or not mac:
            return ''
        mac_suffix = mac.lower().replace(':', '')[-4:]
        parts = (self._vacuum._model or '').split('.')
        if len(parts) < 2:
            return ''
        btn_eid = f'button.{parts[0]}_{parts[-1]}_{mac_suffix}_info'
        btn = hass.states.get(btn_eid)
        if not btn:
            return ''
        multi = btn.attributes.get('sweep.multi_prop_vacuum')
        return self._extract_sn_from_multi_prop(multi)

    @staticmethod
    def _extract_sn_from_multi_prop(multi):
        if isinstance(multi, str):
            try:
                multi = json.loads(multi)
            except (TypeError, ValueError):
                multi = [multi]
        if isinstance(multi, list):
            for item in multi:
                if isinstance(item, str) and ';' in item:
                    return item.split(';', 1)[0]
        return ''


class VacuumMapParser:
    """Fetch, decrypt and parse vacuum map protobuf."""

    def __init__(self, cloud, mac, model, sn, uid, did):
        self.cloud = cloud
        self.did = did
        self.uid = uid
        mac_clean = mac.lower().replace(":", "")
        # Extract short model suffix (e.g. "xiaomi.vacuum.c101" → "c101")
        short_model = model.rsplit('.', 1)[-1] if '.' in model else model
        # Match JS: pad 2-3 char codes
        if len(short_model) == 2:
            short_model = '00' + short_model
        elif len(short_model) == 3:
            short_model = '0' + short_model
        temp_key = (mac_clean + short_model).encode()
        plaintext = f"{sn}+{uid}+{did}"
        def pad(d): p = 16 - len(d) % 16; return d + chr(p) * p
        aes_r = AES.new(temp_key, AES.MODE_ECB).encrypt(pad(plaintext).encode())
        self._decrypt_key = bytes.fromhex(hashlib.md5(base64.b64encode(aes_r)).hexdigest())

    async def fetch_map(self, map_type=0):
        url = await self._get_fds_url(map_type)
        if not url:
            return None
        from homeassistant.helpers.aiohttp_client import async_get_clientsession
        # Use HA's public download session, not Xiaomi's API headers/cookies.
        session = async_get_clientsession(self.cloud.hass)
        # Signed object-store URLs must retain the cloud's exact query encoding.
        async with session.get(URL(url, encoded=True), timeout=ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                raise RuntimeError(f'Map download failed (HTTP {resp.status})')
            raw = await resp.read()
        return self._decrypt(raw)

    async def _get_fds_url(self, map_type):
        rdt = await self.cloud.async_request_api(
            "v2/home/get_interim_file_url_pro",
            {"obj_name": f"{self.uid}/{self.did}/{map_type}"},
            crypt=True,
        )
        if not rdt:
            return None
        result = rdt.get("result") or {}
        if isinstance(result, dict):
            return result.get("url")
        return None

    def _decrypt(self, raw):
        b64 = base64.b64encode(raw)
        dec = AES.new(self._decrypt_key, AES.MODE_ECB).decrypt(base64.b64decode(b64))
        pad_len = dec[-1]
        if 1 <= pad_len <= 16:
            dec = dec[:-pad_len]
        hex_str = dec.decode("ascii", errors="replace")
        # Strip non-hex characters (whitespace, nulls, etc.)
        hex_str = re.sub(r'[^0-9a-fA-F]', '', hex_str)
        return zlib.decompress(bytes.fromhex(hex_str))

    def parse(self, pb_data):
        head, pixels, history, charge, cur, vw, zones, rooms, chains, ext = self._parse(pb_data)
        sx, sy = head.get("sizeX", 0), head.get("sizeY", 0)
        if not sx or not sy: return None

        px_data = pixels
        expected_pixels = sx * sy
        if len(px_data) != expected_pixels and px_data and px_data[0] == 0x0a:
            length, hdr = self._varint(px_data, 1)
            if length == expected_pixels:
                px_data = px_data[hdr:hdr + length]
        if len(px_data) != expected_pixels:
            raise ValueError('Map pixel payload does not match map dimensions')

        path_info = self._parse_path(history, head, sy)
        return {
            "mapInfo": {
                "sizeX": sx, "sizeY": sy,
                "minX": round(head["minX"], 2), "minY": round(head["minY"], 2),
                "maxX": round(head["maxX"], 2), "maxY": round(head["maxY"], 2),
                "resolution": round(head["resolution"], 3),
            },
            "mapData": base64.b64encode(px_data).decode(),
            "rooms": self._parse_rooms(rooms, chains, sy),
            "robot": self._parse_robot_pose(cur, head, sy),
            "chargeStation": self._parse_charge_pose(charge, head, sy),
            "virtualWalls": self._parse_zones(vw, head, sy),
            "cleanZones": self._parse_zones(zones, head, sy),
            "cleaningPath": [point for segment in path_info["cleaning"] for point in segment],
            "cleaningPathSegments": path_info["cleaning"],
            "trackPath": [point for segment in path_info["track"] for point in segment],
            "trackPathSegments": path_info["track"],
            "mapExtInfo": ext,
        }

    def _parse(self, data):
        head = {}; map_bytes = b""; history = charge = cur = None
        vw = []; zones = []; rooms = []; chains = []; ext = {}
        off = 0
        while off < len(data):
            fn, wt, val, off = self._dfield(data, off)
            if fn == 1 and wt == 0: ext["mapType"] = val
            elif fn == 2 and wt == 2:
                ef = self._decode_fields(val)
                bd = {}
                bd_raw = ef.get(7)
                if isinstance(bd_raw, bytes):
                    bf = self._decode_fields(bd_raw)
                    bd = {"vMinX": bf.get(2,0), "vMaxX": bf.get(3,0),
                          "vMinY": bf.get(4,0), "vMaxY": bf.get(5,0)}
                ext.update({"taskBeginDate": ef.get(1,0), "mapUploadDate": ef.get(2,0),
                            "mapValid": ef.get(3), "radian": ef.get(4,0),
                            "force": ef.get(5,0), "cleanPath": ef.get(6),
                            "mapVersion": ef.get(8), "mapValueType": ef.get(9),
                            "boundaryInfo": bd})
            elif fn == 3 and wt == 2:
                hf = self._decode_fields(val)
                head = {"sizeX": hf.get(2,360), "sizeY": hf.get(3,300),
                        "minX": hf.get(4,0.0), "minY": hf.get(5,0.0),
                        "maxX": hf.get(6,0.0), "maxY": hf.get(7,0.0),
                        "resolution": hf.get(8,0.05)}
            elif fn == 4 and wt == 2: map_bytes = val
            elif fn == 6 and wt == 2: history = val
            elif fn == 7 and wt == 2: charge = val
            elif fn == 8 and wt == 2: cur = val
            elif fn == 9 and wt == 2: vw.append(val)
            elif fn == 10 and wt == 2: zones.append(val)
            elif fn == 12 and wt == 2: rooms.append(val)
            elif fn == 14 and wt == 2:
                cf = self._decode_fields(val); rid = cf.get(1)
                pts_raw = cf.get(2, [])
                if not isinstance(pts_raw, list): pts_raw = [pts_raw]
                pts = []
                for ptb in pts_raw:
                    if isinstance(ptb, bytes):
                        pf = self._decode_fields(ptb); x = pf.get(1,0); y = pf.get(2,0)
                        if x < 65536 and y < 65536: pts.append({"x": x, "y": y})
                if rid and len(pts) >= 3: chains.append({"roomId": rid, "points": pts})
        return head, map_bytes, history, charge, cur, vw, zones, rooms, chains, ext

    def _parse_rooms(self, rooms_raw, chains, sy):
        room_dict = {}
        for r in rooms_raw:
            rf = self._decode_fields(r); rid = rf.get(1,0)
            name = rf.get(2, b"")
            if isinstance(name, bytes): name = name.decode("utf-8", errors="replace")
            room_dict[rid] = {"roomId": rid, "name": str(name), "polygon": []}
        for c in chains:
            if c["roomId"] in room_dict:
                room_dict[c["roomId"]]["polygon"] = [{"x": p["x"], "y": sy-1-p["y"]} for p in c["points"]]
        return list(room_dict.values())

    def _parse_robot_pose(self, buf, head, sy):
        if not buf: return None
        pf = self._decode_fields(buf)
        x = pf.get(3, 0); y = pf.get(4, 0); phi = pf.get(5,0)
        if isinstance(x,list): x=x[0]
        if isinstance(y,list): y=y[0]
        if isinstance(phi,list): phi=phi[0]
        return {"x": int((x-head["minX"])/head["resolution"]),
                "y": int(sy-1-(y-head["minY"])/head["resolution"]),
                "phi": round(phi,2), "worldX": round(x,2), "worldY": round(y,2)}

    def _parse_charge_pose(self, buf, head, sy):
        if not buf: return None
        pf = self._decode_fields(buf)
        x = pf.get(1, 0); y = pf.get(2, 0)
        if isinstance(x,list): x=x[0]
        if isinstance(y,list): y=y[0]
        return {"x": int((x-head["minX"])/head["resolution"]),
                "y": int(sy-1-(y-head["minY"])/head["resolution"]),
                "worldX": round(x,2), "worldY": round(y,2)}

    def _parse_zones(self, zones_raw, head, sy):
        result = []
        for z in zones_raw:
            pts = self._get_zone_points(z)
            if len(pts) < 2: continue
            result.append({"polygon": [{"x": int((w[0]-head["minX"])/head["resolution"]),
                                        "y": int(sy-1-(w[1]-head["minY"])/head["resolution"])} for w in pts]})
        return result

    def _parse_path(self, buf, head, sy):
        clean_segments = []
        clean_path = []
        track_path = []
        if not buf:
            return {"cleaning": [], "track": []}
        off = 0
        while off < len(buf):
            fn, wt, val, off = self._dfield(buf, off)
            if fn == 2 and wt == 2:
                pf = self._decode_fields(val)
                update = pf.get(1, 0)
                wx = pf.get(2, None); wy = pf.get(3, None)
                if wx is None or wy is None:
                    continue
                point = {"x": int((wx-head["minX"])/head["resolution"]),
                         "y": int(sy-1-(wy-head["minY"])/head["resolution"]),
                         "worldX": round(wx,2), "worldY": round(wy,2),
                         "update": update}
                track_path.append(point)
                if update == 1:
                    clean_path.append(point)
                elif clean_path:
                    clean_segments.append(clean_path)
                    clean_path = []
        if clean_path:
            clean_segments.append(clean_path)
        return {"cleaning": clean_segments, "track": [track_path] if track_path else []}

    def _get_zone_points(self, buf):
        pts = []; off = 0
        while off < len(buf):
            fn, wt, val, off = self._dfield(buf, off)
            if fn == 4 and wt == 2:
                pf = self._decode_fields(val)
                pts.append((pf.get(1,0.0), pf.get(2,0.0)))
        return pts

    @staticmethod
    def _varint(buf, off):
        v = 0; s = 0
        while True:
            b = buf[off]; v |= (b & 0x7F) << s; s += 7; off += 1
            if not (b & 0x80): break
        return v, off

    @classmethod
    def _dfield(cls, buf, off):
        k, off = cls._varint(buf, off); fn = k >> 3; wt = k & 7
        if wt == 0: val, off = cls._varint(buf, off)
        elif wt == 2: l, off = cls._varint(buf, off); val = buf[off:off+l]; off += l
        elif wt == 1: val = None; off += 8
        elif wt == 5: val = _struct.unpack("<f", buf[off:off+4])[0]; off += 4
        else: val = None; off += 1
        return fn, wt, val, off

    @classmethod
    def _decode_fields(cls, buf):
        fields = {}; off = 0
        while off < len(buf):
            fn, wt, val, off = cls._dfield(buf, off)
            if fn in fields:
                if not isinstance(fields[fn], list): fields[fn] = [fields[fn]]
                fields[fn].append(val)
            else: fields[fn] = val
        return fields
