import { HassEntity } from "home-assistant-js-websocket";
import { html, nothing, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
  computeRTL,
  HomeAssistant,
  isActive,
  isAvailable,
  LovelaceGridOptions,
  LovelaceLayoutOptions,
} from "../ha";
import setupCustomlocalize from "../localize";
import "../shared/badge-icon";
import "../shared/card";
import {
  Appearance,
  AppearanceSharedConfig,
} from "../shared/config/appearance-config";
import { EntitySharedConfig } from "../shared/config/entity-config";
import "../shared/shape-avatar";
import "../shared/shape-icon";
import "../shared/state-info";
import "../shared/state-item";
import { computeAppearance } from "./appearance";
import { MiotMapBaseElement } from "./base-element";
import { computeInfoDisplay } from "./info";

type BaseConfig = EntitySharedConfig & AppearanceSharedConfig;

export function computeDarkMode(hass?: HomeAssistant): boolean {
  if (!hass) return false;
  return (hass.themes as any).darkMode as boolean;
}
export class MiotMapBaseCard<
  T extends BaseConfig = BaseConfig,
  E extends HassEntity = HassEntity,
> extends MiotMapBaseElement {
  @state() protected _config?: T;

  @property({ reflect: true, type: String })
  public layout: string | undefined;

  protected get _stateObj(): E | undefined {
    if (!this._config || !this.hass || !this._config.entity) return undefined;

    const entityId = this._config.entity;
    return this.hass.states[entityId] as E;
  }

  protected get hasControls(): boolean {
    return false;
  }

  setConfig(config: T): void {
    this._config = {
      tap_action: {
        action: "more-info",
      },
      hold_action: {
        action: "more-info",
      },
      ...config,
    };
  }

  public getCardSize(): number | Promise<number> {
    let height = 1;
    if (!this._config) return height;
    const appearance = computeAppearance(this._config);
    if (appearance.layout === "vertical") {
      height += 1;
    }
    if (
      appearance?.layout !== "horizontal" &&
      this.hasControls &&
      !(
        "collapsible_controls" in this._config &&
        this._config?.collapsible_controls
      )
    ) {
      height += 1;
    }
    return height;
  }

  // For HA < 2024.11
  public getLayoutOptions(): LovelaceLayoutOptions {
    if (!this._config) {
      return {
        grid_columns: 2,
        grid_rows: 1,
      };
    }

    const options = {
      grid_columns: 2,
      grid_rows: 0,
    };

    const appearance = computeAppearance(this._config);

    const collapsible_controls =
      "collapsible_controls" in this._config &&
      Boolean(this._config.collapsible_controls);

    const hasInfo =
      appearance.primary_info !== "none" ||
      appearance.secondary_info !== "none";
    const hasIcon = appearance.icon_type !== "none";
    const active = this._stateObj && isActive(this._stateObj);

    const hasControls = this.hasControls && (!collapsible_controls || active);

    if (appearance.layout === "vertical") {
      if (hasIcon) {
        options.grid_rows += 1;
      }
      if (hasInfo) {
        options.grid_rows += 1;
      }
      if (hasControls) {
        options.grid_rows += 1;
      }
    }

    if (appearance.layout === "horizontal") {
      options.grid_rows = 1;
      options.grid_columns = 4;
    }

    if (appearance.layout === "default") {
      if (hasInfo || hasIcon) {
        options.grid_rows += 1;
      }
      if (hasControls) {
        options.grid_rows += 1;
      }
    }

    // If icon only, set 1x1 for size
    if (!hasControls && !hasInfo) {
      options.grid_columns = 1;
      options.grid_rows = 1;
    }

    // Ensure card has at least 1 row
    options.grid_rows = Math.max(options.grid_rows, 1);

    return options;
  }

  public getGridOptions(): LovelaceGridOptions {
    if (!this._config) {
      return {
        columns: 6,
        rows: 1,
      };
    }

    const options = {
      min_rows: 1,
      min_columns: 4,
      columns: 6,
      rows: 0, // initial value
    };

    const appearance = computeAppearance(this._config);

    const collapsible_controls =
      "collapsible_controls" in this._config &&
      Boolean(this._config.collapsible_controls);

    const hasInfo =
      appearance.primary_info !== "none" ||
      appearance.secondary_info !== "none";
    const hasIcon = appearance.icon_type !== "none";
    const active = this._stateObj && isActive(this._stateObj);

    const hasControls = this.hasControls && (!collapsible_controls || active);

    if (appearance.layout === "vertical") {
      if (hasIcon) {
        options.rows += 1;
      }
      if (hasInfo) {
        options.rows += 1;
      }
      if (hasControls) {
        options.rows += 1;
      }
      options.min_columns = 2;
    }

    if (appearance.layout === "horizontal") {
      options.rows = 1;
      options.columns = 12;
    }

    if (appearance.layout === "default") {
      if (hasInfo || hasIcon) {
        options.rows += 1;
      }
      if (hasControls) {
        options.rows += 1;
      }
    }

    // If icon only, set 3x1 for size
    if (!hasControls && !hasInfo) {
      options.columns = 3;
      options.rows = 1;
      options.min_columns = 2;
    }

    // Ensure card has at least 1 row
    options.rows = Math.max(options.rows, 1);
    options.min_rows = options.rows;

    return options;
  }

  protected renderPicture(picture: string): TemplateResult {
    return html`
      <miot-map-shape-avatar
        slot="icon"
        .picture_url=${(this.hass as any).hassUrl(picture)}
      ></miot-map-shape-avatar>
    `;
  }

  protected renderNotFound(config: BaseConfig): TemplateResult {
    const appearance = computeAppearance(config);
    const rtl = computeRTL(this.hass);

    const customLocalize = setupCustomlocalize(this.hass);

    return html`
      <ha-card
        class=${classMap({ "fill-container": appearance.fill_container })}
      >
        <miot-map-card .appearance=${appearance} ?rtl=${rtl}>
          <miot-map-state-item ?rtl=${rtl} .appearance=${appearance} disabled>
            <miot-map-shape-icon slot="icon" disabled>
              <ha-icon icon="mdi:help"></ha-icon>
            </miot-map-shape-icon>
            <miot-map-badge-icon
              slot="badge"
              class="not-found"
              icon="mdi:exclamation-thick"
            ></miot-map-badge-icon>
            <miot-map-state-info
              slot="info"
              .primary=${config.entity}
              .secondary=${customLocalize("card.not_found")}
            ></miot-map-state-info>
          </miot-map-state-item>
        </miot-map-card>
      </ha-card>
    `;
  }

  protected renderIcon(stateObj: HassEntity, icon?: string): TemplateResult {
    const active = isActive(stateObj);
    return html`
      <miot-map-shape-icon slot="icon" .disabled=${!active}>
        <ha-state-icon
          .hass=${this.hass}
          .stateObj=${stateObj}
          .icon=${icon}
        ></ha-state-icon
      ></miot-map-shape-icon>
    `;
  }

  protected renderBadge(stateObj: HassEntity) {
    const unavailable = !isAvailable(stateObj);
    return unavailable
      ? html`
          <miot-map-badge-icon
            class="unavailable"
            slot="badge"
            icon="mdi:help"
          ></miot-map-badge-icon>
        `
      : nothing;
  }

  protected renderStateInfo(
    stateObj: HassEntity,
    appearance: Appearance,
    name: string,
    state?: string
  ): TemplateResult | null {
    const defaultState = this.hass.formatEntityState(stateObj);

    const displayState = state ?? defaultState;

    const primary = computeInfoDisplay(
      appearance.primary_info,
      name,
      displayState,
      stateObj,
      this.hass
    );

    const secondary = computeInfoDisplay(
      appearance.secondary_info,
      name,
      displayState,
      stateObj,
      this.hass
    );

    return html`
      <miot-map-state-info
        slot="info"
        .primary=${primary}
        .secondary=${secondary}
      ></miot-map-state-info>
    `;
  }
}
