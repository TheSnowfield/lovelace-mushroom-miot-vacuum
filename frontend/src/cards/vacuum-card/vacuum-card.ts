import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import {
  actionHandler,
  ActionHandlerEvent,
  computeRTL,
  handleAction,
  hasAction,
  HomeAssistant,
  isActive,
  LovelaceCard,
  LovelaceCardEditor,
  VacuumEntity,
} from "../../ha";
import "../../shared/badge-icon";
import "../../shared/card";
import "../../shared/shape-icon";
import "../../shared/state-info";
import "../../shared/state-item";
import { computeAppearance } from "../../utils/appearance";
import { MiotMapBaseCard } from "../../utils/base-card";
import { cardStyle } from "../../utils/card-styles";
import { computeEntityName } from "../../utils/compute-entity-name";
import { registerCustomCard } from "../../utils/custom-cards";
import { computeEntityPicture } from "../../utils/info";
import {
  VACUUM_CARD_EDITOR_NAME,
  VACUUM_CARD_NAME,
  VACUUM_ENTITY_DOMAINS,
} from "./const";
import "./controls/miot-vacuum-map-control";
import "./controls/vacuum-commands-control";
import {
  isCommandsControlSupported,
  isCommandsControlVisible,
} from "./controls/vacuum-commands-control";
import { MiotVacuumMapData } from "./miot-vacuum-map";
import { isCleaning, isReturningHome } from "./utils";
import { VacuumCardConfig } from "./vacuum-card-config";

const MIOT_MAP_REFRESH_INTERVAL = 5000;
const MIOT_MAP_RETRY_INTERVAL = 30000;

registerCustomCard({
  type: VACUUM_CARD_NAME,
  name: "Miot Vacuum Map Card",
  description: "Independent Xiaomi vacuum map and controls",
});

@customElement(VACUUM_CARD_NAME)
export class VacuumCard
  extends MiotMapBaseCard<VacuumCardConfig, VacuumEntity>
  implements LovelaceCard
{
  @state() private _miotMap?: MiotVacuumMapData;

  @state() private _miotMapError?: string;

  @state() private _miotMapLoading = false;

  private _miotMapTimer?: number;

  private _miotMapRetryTimer?: number;

  private _miotMapFetch?: Promise<void>;

  private _miotMapUnavailableUntil = 0;

  private _miotMapSinglePollKey?: string;

  private _miotMapEntity?: string;

  private _miotMapGeneration = 0;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./vacuum-card-editor");
    return document.createElement(
      VACUUM_CARD_EDITOR_NAME
    ) as LovelaceCardEditor;
  }

  public static async getStubConfig(
    hass: HomeAssistant
  ): Promise<VacuumCardConfig> {
    const entities = Object.keys(hass.states);
    const vacuums = entities.filter((e) =>
      VACUUM_ENTITY_DOMAINS.includes(e.split(".")[0])
    );
    return {
      type: `custom:${VACUUM_CARD_NAME}`,
      entity: vacuums[0],
    };
  }

  protected get hasControls() {
    if (!this._stateObj || !this._config) return false;
    return isCommandsControlSupported(
      this._stateObj,
      this._config.commands ?? []
    );
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._syncMiotMapPolling();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._miotMapGeneration += 1;
    this._miotMapSinglePollKey = undefined;
    this._stopMiotMapPolling();
    if (this._miotMapRetryTimer) {
      window.clearTimeout(this._miotMapRetryTimer);
      this._miotMapRetryTimer = undefined;
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    this._syncMiotMapPolling();
  }

  protected render() {
    if (!this._config || !this.hass || !this._config.entity) {
      return nothing;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return this.renderNotFound(this._config);
    }

    const name = computeEntityName(this.hass, stateObj, this._config.name);
    const icon = this._config.icon;
    const appearance = computeAppearance(this._config);
    const picture = computeEntityPicture(stateObj, appearance.icon_type);

    const rtl = computeRTL(this.hass);

    const commands = this._config?.commands ?? [];

    return html`
      <ha-card
        class=${classMap({
          "fill-container": appearance.fill_container,
          "miot-map-card": this._hasMiotMapSlot,
        })}
      >
        <miot-map-card .appearance=${appearance} ?rtl=${rtl}>
          <miot-map-state-item
            ?rtl=${rtl}
            .appearance=${appearance}
            @action=${this._handleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this._config.hold_action),
              hasDoubleClick: hasAction(this._config.double_tap_action),
            })}
          >
            ${picture
              ? this.renderPicture(picture)
              : this.renderIcon(stateObj, icon)}
            ${this.renderBadge(stateObj)}
            ${this.renderStateInfo(stateObj, appearance, name)}
          </miot-map-state-item>
          ${isCommandsControlVisible(stateObj, commands)
            ? html`
                <div class="actions" ?rtl=${rtl}>
                  <miot-map-vacuum-commands-control
                    .hass=${this.hass}
                    .entity=${stateObj}
                    .commands=${commands}
                    .fill=${appearance.layout !== "horizontal"}
                  >
                  </miot-map-vacuum-commands-control>
                </div>
              `
            : nothing}
          ${this._renderMiotMap()}
        </miot-map-card>
      </ha-card>
    `;
  }

  private _renderMiotMap(): TemplateResult | typeof nothing {
    if (!this._isMiotMapEnabled) return nothing;
    if (!this._miotMap) {
      return this._shouldRenderMiotMapPlaceholder
        ? html`<div class="miot-map-placeholder" aria-hidden="true"></div>`
        : nothing;
    }
    return html`
      <miot-map-miot-vacuum-map-control
        .map=${this._miotMap}
      ></miot-map-miot-vacuum-map-control>
    `;
  }

  private get _hasMiotMapSlot(): boolean {
    return Boolean(
      this._isMiotMapEnabled &&
        (this._miotMap || this._shouldRenderMiotMapPlaceholder)
    );
  }

  private get _shouldRenderMiotMapPlaceholder(): boolean {
    if (!this._isMiotMapEnabled) return false;
    const state = this._stateObj?.state;
    return (
      this._miotMapLoading || state === "unavailable" || state === "unknown"
    );
  }

  private get _isMiotMapEnabled(): boolean {
    return Boolean(this._config?.show_map);
  }

  private _syncMiotMapPolling(): void {
    if (!this.isConnected) return;
    if (this._miotMapEntity !== this._config?.entity) {
      this._resetMiotMap();
      this._miotMapEntity = this._config?.entity;
    }
    const stateObj = this._stateObj;
    if (!this._isMiotMapEnabled) {
      this._resetMiotMap();
      return;
    }
    if (!this.hass || !this._config?.entity || !stateObj) {
      this._stopMiotMapPolling();
      return;
    }
    if (Date.now() < this._miotMapUnavailableUntil) {
      this._stopMiotMapPolling();
      return;
    }

    if (!isCleaning(stateObj) && !isReturningHome(stateObj)) {
      this._stopMiotMapPolling();
      const pollKey = `${this._config.entity}:${stateObj.state}`;
      if (this._miotMapSinglePollKey !== pollKey) {
        this._miotMapSinglePollKey = pollKey;
        this._refreshMiotVacuum();
      }
      return;
    }

    this._miotMapSinglePollKey = undefined;
    if (!this._miotMapTimer) {
      this._refreshMiotVacuum();
      this._miotMapTimer = window.setInterval(
        () => this._refreshMiotVacuum(),
        MIOT_MAP_REFRESH_INTERVAL
      );
    }
  }

  private _stopMiotMapPolling(): void {
    if (!this._miotMapTimer) return;
    window.clearInterval(this._miotMapTimer);
    this._miotMapTimer = undefined;
  }

  private _resetMiotMap(): void {
    this._miotMapGeneration += 1;
    this._stopMiotMapPolling();
    if (this._miotMapRetryTimer) {
      window.clearTimeout(this._miotMapRetryTimer);
      this._miotMapRetryTimer = undefined;
    }
    this._miotMap = undefined;
    this._miotMapError = undefined;
    this._miotMapLoading = false;
    this._miotMapUnavailableUntil = 0;
    this._miotMapSinglePollKey = undefined;
  }

  private _scheduleMiotMapRetry(): void {
    if (this._miotMapRetryTimer) {
      window.clearTimeout(this._miotMapRetryTimer);
    }
    this._miotMapRetryTimer = window.setTimeout(() => {
      this._miotMapRetryTimer = undefined;
      this._syncMiotMapPolling();
    }, MIOT_MAP_RETRY_INTERVAL);
  }

  private _refreshMiotVacuum(): void {
    if (
      this._miotMapFetch ||
      !this._isMiotMapEnabled ||
      !this.hass ||
      !this._config?.entity
    )
      return;
    const entityId = this._config.entity;
    const generation = this._miotMapGeneration;
    this._miotMapLoading = !this._miotMap;
    this._miotMapFetch = (async () => {
      try {
        const map = await this.hass!.callWS<MiotVacuumMapData>({
          type: "miot_vacuum_map/get_map",
          entity_id: entityId,
          map_type: 0,
          include_map_data: true,
        });
        if (!this.isConnected || generation !== this._miotMapGeneration || !this._isMiotMapEnabled || this._config?.entity !== entityId) {
          return;
        }
        this._miotMap = map;
        this._miotMapError = undefined;
        this._miotMapUnavailableUntil = 0;
      } catch (err) {
        if (!this.isConnected || generation !== this._miotMapGeneration || !this._isMiotMapEnabled || this._config?.entity !== entityId) {
          return;
        }
        this._miotMapError = this._formatMiotMapError(err);
        this._miotMapUnavailableUntil = Date.now() + MIOT_MAP_RETRY_INTERVAL;
        this._stopMiotMapPolling();
        this._scheduleMiotMapRetry();
      } finally {
        this._miotMapFetch = undefined;
        if (this._config?.entity === entityId) {
          this._miotMapLoading = false;
        }
        if (generation !== this._miotMapGeneration && this.isConnected && this._isMiotMapEnabled) {
          this._miotMapSinglePollKey = undefined;
          this._syncMiotMapPolling();
        }
      }
    })();
  }

  private _formatMiotMapError(err: unknown): string {
    if (err && typeof err === "object") {
      const detail = err as { code?: string; message?: string };
      if (detail.code || detail.message) {
        return [detail.code, detail.message].filter(Boolean).join(": ");
      }
    }
    return err instanceof Error ? err.message : String(err);
  }

  protected renderIcon(stateObj: HassEntity, icon?: string): TemplateResult {
    return html`
      <miot-map-shape-icon
        slot="icon"
        class=${classMap({
          returning:
            isReturningHome(stateObj) && Boolean(this._config?.icon_animation),
          cleaning:
            isCleaning(stateObj) && Boolean(this._config?.icon_animation),
        })}
        style=${styleMap({})}
        .disabled=${!isActive(stateObj)}
      >
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${stateObj}
          .icon=${icon}
        ></ha-state-icon
      ></miot-map-shape-icon>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      cardStyle,
      css`
        miot-map-state-item {
          cursor: pointer;
        }
        miot-map-shape-icon {
          --icon-color: rgb(var(--rgb-state-vacuum));
          --shape-color: rgba(var(--rgb-state-vacuum), 0.2);
        }
        .cleaning ha-state-icon {
          animation: 5s infinite linear cleaning;
        }
        .cleaning ha-state-icon {
          animation: 2s infinite linear returning;
        }
        miot-map-vacuum-commands-control {
          flex: 1;
        }
        .miot-map-placeholder {
          position: relative;
          display: block;
          flex: 1 1 180px;
          height: clamp(120px, 36vh, 300px);
          min-height: 0;
          margin: 0 var(--spacing) var(--spacing);
          overflow: hidden;
          border-radius: 8px;
          background:
            linear-gradient(
              120deg,
              transparent 0 34%,
              rgba(var(--rgb-primary-text-color), 0.08) 44%,
              transparent 54%
            ),
            repeating-linear-gradient(
              0deg,
              rgba(var(--rgb-primary-text-color), 0.06) 0 1px,
              transparent 1px 24px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(var(--rgb-primary-text-color), 0.05) 0 1px,
              transparent 1px 24px
            ),
            rgba(var(--rgb-primary-text-color), 0.035);
          background-size:
            220% 100%,
            auto,
            auto,
            auto;
          box-shadow: inset 0 0 0 1px var(--divider-color);
          pointer-events: none;
        }
        .miot-map-placeholder::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(var(--rgb-primary-text-color), 0.08),
            transparent
          );
          transform: translateX(-100%);
          animation: miot-map-placeholder 1.4s infinite;
        }
        ha-card.miot-map-card {
          overflow: hidden;
        }
        ha-card.miot-map-card miot-map-card {
          position: relative;
          overflow: hidden;
          min-height: 280px;
        }
        :host([layout="grid"]) ha-card.miot-map-card miot-map-card {
          min-height: 0;
        }
        ha-card.miot-map-card miot-map-state-item {
          position: relative;
          z-index: 1;
          flex: 0 0 auto !important;
          height: auto !important;
        }
        ha-card.miot-map-card .actions {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
        }
        @keyframes miot-map-placeholder {
          to {
            transform: translateX(100%);
          }
        }
      `,
    ];
  }
}
