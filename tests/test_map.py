"""Regression tests for map decode, travel paths and provider caching."""
import asyncio
import base64
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import struct
import unittest
import zlib

from Crypto.Cipher import AES

spec = importlib.util.spec_from_file_location('map_backend', Path(__file__).resolve().parents[1] / 'custom_components/miot_vacuum_map/map.py')
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


def varint(n):
    result = bytearray()
    while n > 127:
        result.append((n & 127) | 128)
        n >>= 7
    result.append(n)
    return bytes(result)


def field(n, value):
    if isinstance(value, bytes):
        return varint(n * 8 + 2) + varint(len(value)) + value
    if isinstance(value, float):
        return varint(n * 8 + 5) + struct.pack('<f', value)
    return varint(n * 8) + varint(value)


def fixture():
    head = b''.join(field(n, v) for n, v in [(2, 3), (3, 2), (4, 0.0), (5, 0.0), (6, 3.0), (7, 2.0), (8, 1.0)])
    history = b''.join(field(2, field(1, active) + field(2, float(x)) + field(3, 0.0)) for active, x in [(1, 0), (0, 1), (1, 2)])
    robot = field(3, 2.0) + field(4, 0.0) + field(5, 1.0)
    return field(3, head) + field(4, bytes([0, 0, 0, 255, 1, 0])) + field(6, history) + field(8, robot)


class DecodeTests(unittest.TestCase):
    def setUp(self):
        self.parser = backend.VacuumMapParser(None, 'aa:bb:cc:dd:ee:ff', 'xiaomi.vacuum.c101', 'TESTSN', '123', '456')

    def test_pixels_and_coordinates(self):
        data = self.parser.parse(fixture())
        self.assertEqual(len(base64.b64decode(data['mapData'])), 6)
        self.assertEqual(data['robot']['x'], 2)
        self.assertEqual(data['robot']['y'], 1)

    def test_travel_points_animate_but_do_not_draw(self):
        data = self.parser.parse(fixture())
        self.assertEqual(len(data['trackPath']), 3)
        self.assertEqual(len(data['cleaningPath']), 2)
        self.assertEqual([len(segment) for segment in data['cleaningPathSegments']], [1, 1])

    def test_encrypted_round_trip(self):
        payload = zlib.compress(fixture()).hex().encode()
        padding = 16 - len(payload) % 16
        encrypted = AES.new(self.parser._decrypt_key, AES.MODE_ECB).encrypt(payload + bytes([padding]) * padding)
        self.assertEqual(self.parser._decrypt(encrypted), fixture())

    def test_wrapped_pixels_keep_the_first_pixel(self):
        raw = bytes([0, 0, 0, 255, 1, 0])
        payload = fixture().replace(field(4, raw), field(4, field(1, raw)))
        self.assertEqual(base64.b64decode(self.parser.parse(payload)['mapData']), raw)

    def test_raw_pixels_starting_with_wrapper_tag_are_not_unwrapped(self):
        raw = bytes([10, 0, 0, 255, 1, 0])
        payload = fixture().replace(field(4, bytes([0, 0, 0, 255, 1, 0])), field(4, raw))
        self.assertEqual(base64.b64decode(self.parser.parse(payload)['mapData']), raw)


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_requests_share_cache_and_force_bypasses_it(self):
        parser = backend.VacuumMapParser(None, 'aa:bb:cc:dd:ee:ff', 'c101', 'TESTSN', '123', '456')
        calls = []
        async def fetch_map(map_type):
            calls.append(map_type)
            await asyncio.sleep(0)
            return fixture()
        parser.fetch_map = fetch_map
        provider = backend.MiotVacuumMapProvider(SimpleNamespace(entity_id='vacuum.test'))
        provider._get_parser = lambda: parser
        light, full = await asyncio.gather(provider.async_get_map(include_map_data=False), provider.async_get_map())
        self.assertNotIn('mapData', light)
        self.assertIn('mapData', full)
        self.assertEqual(calls, [0])
        await provider.async_get_map(force=True)
        await provider.async_get_map(map_type=1)
        self.assertEqual(calls, [0, 0, 1])

    def test_serial_number_from_miot_multi_property(self):
        self.assertEqual(backend.MiotVacuumMapProvider._extract_sn_from_multi_prop('[0,"SN123;456"]'), 'SN123')


if __name__ == '__main__':
    unittest.main()
