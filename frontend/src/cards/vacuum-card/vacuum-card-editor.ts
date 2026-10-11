import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import memoizeOne from "memoize-one";
import { assert } from "superstruct";
import { LocalizeFunc, LovelaceCardEditor, fireEvent } from "../../ha";
import setupCustomlocalize from "../../localize";
import { computeActionsFormSchema } from "../../shared/config/actions-config";
import { computeAppearanceFormSchema } from "../../shared/config/appearance-config";
import { MiotMapBaseElement } from "../../utils/base-element";
import { GENERIC_LABELS } from "../../utils/form/generic-fields";
import { HaFormSchema } from "../../utils/form/ha-form";
import { computeNameSchema } from "../../utils/form/name-schema";
import { loadHaComponents } from "../../utils/loader";
import { VACUUM_CARD_EDITOR_NAME, VACUUM_ENTITY_DOMAINS } from "./const";
import {
  VACUUM_COMMANDS,
  VacuumCardConfig,
  vacuumCardConfigStruct,
} from "./vacuum-card-config";

const VACUUM_LABELS = ["commands"];

declare global {
  interface HASSDomEvents {
    "config-changed": { config: VacuumCardConfig };
  }
}

const computeSchema = memoizeOne(
  (
    localize: LocalizeFunc,
    customLocalize: LocalizeFunc,
    version: string
  ): HaFormSchema[] => [
    { name: "entity", selector: { entity: { domain: VACUUM_ENTITY_DOMAINS } } },
    computeNameSchema(version),
    {
      type: "grid",
      name: "",
      schema: [
        {
          name: "icon",
          selector: { icon: {} },
          context: { icon_entity: "entity" },
        },
        { name: "icon_animation", selector: { boolean: {} } },
        { name: "show_map", selector: { boolean: {} } },
      ],
    },
    ...computeAppearanceFormSchema(customLocalize),
    {
      name: "commands",
      selector: {
        select: {
          mode: "list",
          multiple: true,
          options: VACUUM_COMMANDS.map((command) => ({
            value: command,
            label:
              command === "on_off"
                ? customLocalize(`editor.card.vacuum.commands_list.${command}`)
                : localize(`ui.dialogs.more_info_control.vacuum.${command}`),
          })),
        },
      },
    },
    ...computeActionsFormSchema(),
  ]
);

@customElement(VACUUM_CARD_EDITOR_NAME)
export class VacuumCardEditor
  extends MiotMapBaseElement
  implements LovelaceCardEditor
{
  @state() private _config?: VacuumCardConfig;

  connectedCallback() {
    super.connectedCallback();
    void loadHaComponents();
  }

  public setConfig(config: VacuumCardConfig): void {
    assert(config, vacuumCardConfigStruct);
    this._config = config;
  }

  private _computeLabel = (schema: HaFormSchema) => {
    const customLocalize = setupCustomlocalize(this.hass!);

    if (GENERIC_LABELS.includes(schema.name)) {
      return customLocalize(`editor.card.generic.${schema.name}`);
    }
    if (VACUUM_LABELS.includes(schema.name)) {
      return customLocalize(`editor.card.vacuum.${schema.name}`);
    }
    if (schema.name === "show_map") {
      return this.hass?.language?.startsWith("zh") ? "显示地图" : "Show map";
    }
    return this.hass!.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}`
    );
  };

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const customLocalize = setupCustomlocalize(this.hass!);
    const schema = computeSchema(
      this.hass!.localize,
      customLocalize,
      this.hass!.config.version
    );

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }
}
