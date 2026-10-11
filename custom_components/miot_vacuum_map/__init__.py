"""Independent map extension for Xiaomi Miot vacuum entities."""

import voluptuous as vol
from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.components import websocket_api
from homeassistant.helpers import config_validation as cv

from .map import MiotVacuumMapProvider

DOMAIN = 'miot_vacuum_map'
CONFIG_SCHEMA = vol.Schema({vol.Optional(DOMAIN): vol.Schema({})}, extra=vol.ALLOW_EXTRA)


async def async_setup(hass, config):
    """Register our API; resolve live Miot entities lazily after startup/reload."""
    hass.data.setdefault(DOMAIN, {})
    websocket_api.async_register_command(hass, websocket_get_map)
    return True


def find_vacuum(hass, entity_id):
    entities = hass.data.get('xiaomi_miot', {}).get('entities', {})
    entity = entities.get(entity_id)
    if entity is not None and getattr(entity, 'entity_id', '').startswith('vacuum.'):
        return entity
    for candidate in entities.values():
        if getattr(candidate, 'entity_id', None) == entity_id and entity_id.startswith('vacuum.'):
            return candidate
    return None


@websocket_api.websocket_command({
    vol.Required('type'): 'miot_vacuum_map/get_map',
    vol.Required('entity_id'): cv.entity_id,
    vol.Optional('map_type', default=0): vol.All(vol.Coerce(int), vol.Range(min=0, max=2)),
    vol.Optional('include_map_data', default=True): cv.boolean,
    vol.Optional('force', default=False): cv.boolean,
})
@websocket_api.async_response
async def websocket_get_map(hass, connection, msg):
    if not connection.user.permissions.check_entity(msg['entity_id'], POLICY_READ):
        connection.send_error(msg['id'], 'unauthorized', 'Entity read permission is required')
        return
    vacuum = find_vacuum(hass, msg['entity_id'])
    if vacuum is None:
        connection.send_error(msg['id'], 'not_found', 'Xiaomi Miot vacuum entity is not loaded')
        return
    cache = hass.data[DOMAIN]
    provider = cache.get(msg['entity_id'])
    if provider is None or provider._vacuum is not vacuum:
        provider = cache[msg['entity_id']] = MiotVacuumMapProvider(vacuum)
    try:
        data = await provider.async_get_map(
            map_type=msg['map_type'], include_map_data=msg['include_map_data'], force=msg['force']
        )
        connection.send_result(msg['id'], data)
    except Exception:
        connection.send_error(msg['id'], 'map_fetch_failed', 'Unable to retrieve vacuum map')
