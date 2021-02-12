import {BasicInfoWindow} from "../windows/BasicInfoWindow";
import {ItemPsynergyChooseWindow} from "../windows/ItemPsynergyChooseWindow";
import {TextObj, Window} from "../Window";
import * as numbers from "../magic_numbers";
import {ItemOptionsWindow} from "../windows/item/ItemOptionsWindow";
import {Item, item_types} from "../Item";
import {GoldenSun} from "../GoldenSun";
import {CharsMenu, CharsMenuModes} from "../support_menus/CharsMenu";
import {ItemSlot, MainChar} from "../MainChar";
import {ItemQuantityManagerWindow} from "../windows/item/ItemQuantityManagerWindow";
import {StatsOrClassCheckWithItemWindow} from "../windows/item/StatsOrClassCheckWithItemWindow";
import {Ability, ability_types} from "../Ability";
import {main_stats, permanent_status} from "../Player";
import {Effect, effect_types} from "../Effect";
import {BattleFormulas} from "../battle/BattleFormulas";
import * as _ from "lodash";

const GUIDE_WINDOW_X = 104;
const GUIDE_WINDOW_Y = 0;
const GUIDE_WINDOW_WIDTH = 132;
const GUIDE_WINDOW_HEIGHT = 20;

const DESCRIPTION_WINDOW_X = 0;
const DESCRIPTION_WINDOW_Y = 136;
const DESCRIPTION_WINDOW_WIDTH = 236;
const DESCRIPTION_WINDOW_HEIGHT = 20;

const ITEM_OVERVIEW_WIN_X = 104;
const ITEM_OVERVIEW_WIN_Y = 24;
const ITEM_OVERVIEW_WIN_WIDTH = 132;
const ITEM_OVERVIEW_WIN_HEIGHT = 76;

const ARRANGE_WINDOW_X = 104;
const ARRANGE_WINDOW_Y = 104;
const ARRANGE_WINDOW_WIDTH = 132;
const ARRANGE_WINDOW_HEIGHT = 28;

const TOTAL_BORDER = numbers.INSIDE_BORDER_WIDTH + numbers.OUTSIDE_BORDER_WIDTH;
const ITEM_OVERVIEW_WIN_INSIDE_PADDING_H = 11;
const ITEM_OVERVIEW_WIN_INSIDE_PADDING_V = 12;
const ITEM_OVERVIEW_WIN_ICONS_PER_LINE = 5;
const ITEM_OVERVIEW_WIN_SPACE_BETWN_LINE = 3;
const ITEM_OVERVIEW_WIN_SPACE_BETWN_ICO =
    (ITEM_OVERVIEW_WIN_WIDTH -
        2 * (numbers.INSIDE_BORDER_WIDTH + ITEM_OVERVIEW_WIN_INSIDE_PADDING_H) -
        ITEM_OVERVIEW_WIN_ICONS_PER_LINE * numbers.ICON_WIDTH) /
    (ITEM_OVERVIEW_WIN_ICONS_PER_LINE - 1);

const SUB_ICON_X = 7;
const SUB_ICON_Y = 8;
const ITEM_OVERVIEW_Y_SHIFT = 16;
const ITEM_OVERVIEW_HEIGHT_SHIFT = 16;

export class MainItemMenu {
    public game: Phaser.Game;
    public data: GoldenSun;

    public chars_menu: CharsMenu;
    public basic_info_window: BasicInfoWindow;
    public item_change_stats_window: StatsOrClassCheckWithItemWindow;

    public selected_char_index: number;
    public selected_item_pos: {page: number; index: number};
    public is_open: boolean;
    public choosing_destination: boolean;
    public overview_shifted: boolean;
    public close_callback: Function;

    public guide_window: Window;
    public guide_window_text: TextObj;
    public choosing_item: boolean;
    public guide_window_msgs: {
        choosing_char: string;
        choosing_item: string;
    };
    public description_window: Window;
    public description_window_text: TextObj;
    public description_window_tween: Phaser.Tween;
    public arrange_window: Window;
    public arrange_window_text: TextObj;
    public item_overview_window: Window;
    public item_choose_window: ItemPsynergyChooseWindow;
    public item_options_window: ItemOptionsWindow;
    public item_quant_win: ItemQuantityManagerWindow;

    constructor(game: Phaser.Game, data: GoldenSun) {
        this.game = game;
        this.data = data;

        this.chars_menu = new CharsMenu(this.game, this.data, this.char_change.bind(this));
        this.basic_info_window = new BasicInfoWindow(this.game);
        this.item_change_stats_window = new StatsOrClassCheckWithItemWindow(this.game, this.data);

        this.selected_char_index = 0;
        this.selected_item_pos = {page: 0, index: 0};
        this.is_open = false;
        this.choosing_destination = false;
        this.overview_shifted = false;
        this.close_callback = null;

        this.guide_window = new Window(
            this.game,
            GUIDE_WINDOW_X,
            GUIDE_WINDOW_Y,
            GUIDE_WINDOW_WIDTH,
            GUIDE_WINDOW_HEIGHT
        );
        this.guide_window_text = this.guide_window.set_single_line_text("");
        this.choosing_item = false;
        this.guide_window_msgs = {
            choosing_char: "Whose item?",
            choosing_item: "Which item?",
        };
        this.description_window = new Window(
            this.game,
            DESCRIPTION_WINDOW_X,
            DESCRIPTION_WINDOW_Y,
            DESCRIPTION_WINDOW_WIDTH,
            DESCRIPTION_WINDOW_HEIGHT
        );
        this.description_window_text = this.description_window.set_single_line_text("");
        this.description_window_tween = null;
        this.arrange_window = new Window(
            this.game,
            ARRANGE_WINDOW_X,
            ARRANGE_WINDOW_Y,
            ARRANGE_WINDOW_WIDTH,
            ARRANGE_WINDOW_HEIGHT
        );
        this.arrange_window_text = this.arrange_window.set_text(["Arrange info here..."], undefined, 7, 3);
        this.item_overview_window = new Window(
            this.game,
            ITEM_OVERVIEW_WIN_X,
            ITEM_OVERVIEW_WIN_Y,
            ITEM_OVERVIEW_WIN_WIDTH,
            ITEM_OVERVIEW_WIN_HEIGHT
        );
        this.item_choose_window = new ItemPsynergyChooseWindow(
            this.game,
            this.data,
            false,
            this.item_change.bind(this)
        );
        this.item_options_window = new ItemOptionsWindow(this.game, this.data);
        this.item_quant_win = new ItemQuantityManagerWindow(this.game, this.data);
    }

    shift_item_overview(down: boolean, hide_sub_menus: boolean = true) {
        if (this.overview_shifted === down) return;

        if (hide_sub_menus) {
            if (down) {
                this.item_choose_window.hide();
                this.item_options_window.hide();
            } else {
                this.item_choose_window.show();
                this.item_options_window.show();
            }
        }

        this.item_overview_window.update_position({y: ITEM_OVERVIEW_WIN_Y + (down ? ITEM_OVERVIEW_Y_SHIFT : 0)});
        this.item_overview_window.update_size({
            height: ITEM_OVERVIEW_WIN_HEIGHT + (down ? ITEM_OVERVIEW_HEIGHT_SHIFT : 0),
        });
        this.overview_shifted = down;
    }

    cast_ability(caster: MainChar, dest_char: MainChar, ability: Ability) {
        if (ability.type === ability_types.HEALING) {
            const value = BattleFormulas.get_damage(ability, caster, dest_char, 1);
            const current_prop = ability.affects_pp ? main_stats.CURRENT_PP : main_stats.CURRENT_HP;
            const max_prop = ability.affects_pp ? main_stats.MAX_PP : main_stats.MAX_HP;
            if (dest_char[max_prop] > dest_char[current_prop]) {
                dest_char.current_hp = _.clamp(dest_char[current_prop] - value, 0, dest_char[max_prop]);
                if (dest_char[max_prop] === dest_char[current_prop]) {
                    this.set_description_window_text("You recovered all HP!", true);
                } else {
                    this.set_description_window_text(`You recovered ${-value}HP!`, true);
                }
                this.data.audio.play_se("battle/heal_1");
                return true;
            } else {
                this.set_description_window_text(`Your ${ability.affects_pp ? "PP" : "HP"} is maxed out!`, true);
                return false;
            }
        } else if (ability.type === ability_types.EFFECT_ONLY) {
            const extra_stat_label_map = {
                [effect_types.EXTRA_ATTACK]: "ATK",
                [effect_types.EXTRA_DEFENSE]: "DEF",
                [effect_types.EXTRA_AGILITY]: "AGI",
                [effect_types.EXTRA_LUCK]: "LUK",
                [effect_types.EXTRA_MAX_HP]: "HP",
                [effect_types.EXTRA_MAX_PP]: "PP",
            };
            const status_label_map = {
                [permanent_status.DOWNED]: "downed",
                [permanent_status.POISON]: "poisoned",
                [permanent_status.VENOM]: "poisoned",
                [permanent_status.EQUIP_CURSE]: "cursed",
                [permanent_status.HAUNT]: "haunted",
            };
            const stats_boosted = [];
            const status_removed = {removed: [], not_removed: []};
            for (let i = 0; i < ability.effects.length; ++i) {
                const effect_obj = ability.effects[i];
                switch (effect_obj.type) {
                    case effect_types.EXTRA_ATTACK:
                    case effect_types.EXTRA_DEFENSE:
                    case effect_types.EXTRA_AGILITY:
                    case effect_types.EXTRA_LUCK:
                    case effect_types.EXTRA_MAX_HP:
                    case effect_types.EXTRA_MAX_PP:
                        dest_char.add_effect(effect_obj, ability, true);
                        dest_char.update_attributes();
                        stats_boosted.push(extra_stat_label_map[effect_obj.type]);
                        break;
                    case effect_types.PERMANENT_STATUS:
                        if (!effect_obj.add_status) {
                            if (dest_char.has_permanent_status(effect_obj.status_key_name)) {
                                Effect.remove_status_from_player(effect_obj, dest_char);
                                status_removed.removed.push(status_label_map[effect_obj.status_key_name]);
                            } else {
                                status_removed.not_removed.push(status_label_map[effect_obj.status_key_name]);
                            }
                        }
                        break;
                }
            }
            let stats_description = "";
            let status_description = "";
            if (stats_boosted.length) {
                stats_description = `Your ${stats_boosted.join("/")} increased!`;
            }
            if (status_removed.removed.length || status_removed.not_removed.length) {
                if (status_removed.removed.length) {
                    status_description = `${dest_char.name} is not ${_.uniq(status_removed.removed).join(
                        "/"
                    )} anymore!`;
                } else {
                    if (!stats_boosted.length) {
                        this.set_description_window_text(
                            `${dest_char.name} is not ${_.uniq(status_removed.not_removed).join("/")}.`,
                            true
                        );
                        return false;
                    }
                }
            }
            const description = `${stats_description} ${status_description}`.trim();
            if (description) {
                this.set_description_window_text(description, true, true);
                return true;
            }
        }
        this.set_description_window_text("This ability can't be used here.", true);
        return false;
    }

    char_change() {
        this.selected_char_index = this.chars_menu.selected_index;
        this.basic_info_window.set_char(this.data.info.party_data.members[this.selected_char_index]);
        this.set_item_icons();

        if (this.choosing_destination) {
            if (this.item_options_window.item.type === item_types.ABILITY_GRANTOR) {
            } else if (this.item_options_window.item.type !== item_types.GENERAL_ITEM) {
                const preview_obj = Object.assign({}, this.item_options_window.item_obj, {equipped: false});
                this.item_change_stats_window.open(
                    this.data.info.party_data.members[this.selected_char_index],
                    this.item_options_window.item,
                    preview_obj
                );
                this.item_change_stats_window.compare_items();
            }
            this.set_description_window_text(this.item_options_window.item.description, true);
        } else {
            if (this.item_choose_window.window_open && !this.item_options_window.window_open) {
                this.item_choose_window.close();
                this.item_choose_window.open(this.chars_menu.selected_index);
            }
        }
    }

    char_choose() {
        if (this.choosing_destination) {
            if (
                this.data.info.party_data.members[this.selected_char_index].key_name ===
                this.item_options_window.char.key_name
            )
                return;
            this.chars_menu.deactivate();
        } else {
            this.chars_menu.deactivate();
            this.choosing_item = true;
            this.set_guide_window_text();
            this.item_choose_window.open(
                this.selected_char_index,
                () => {
                    this.on_item_choose_close();
                },
                undefined,
                this.selected_item_pos
            );
        }

        this.item_choose_window.grant_control(
            this.open_char_select.bind(this),
            () => {
                const item_win = this.item_choose_window;
                this.selected_item_pos = {page: item_win.page_index, index: item_win.selected_element_index};

                const selected_item =
                    item_win.element_list[(item_win.elements[item_win.selected_element_index] as ItemSlot).key_name];
                const selected_item_obj = item_win.item_objs[item_win.selected_element_index];

                this.item_choose(selected_item, selected_item_obj);
            },
            this.chars_menu.next_char.bind(this.chars_menu),
            this.chars_menu.previous_char.bind(this.chars_menu)
        );
    }

    on_item_choose_close() {
        this.choosing_item = false;
        this.chars_menu.activate();
        this.set_guide_window_text();
        this.set_description_window_text();
        this.set_item_icons();
        if (this.item_change_stats_window.window_open) {
            this.item_change_stats_window.close();
        }
    }

    item_change(item: Item, item_obj: ItemSlot) {
        this.set_description_window_text(item.description);

        if (this.item_change_stats_window.window_open) {
            this.item_change_stats_window.close();
        }

        if (item.type === item_types.ABILITY_GRANTOR) {
        } else if (item.type !== item_types.GENERAL_ITEM) {
            this.item_change_stats_window.open(
                this.data.info.party_data.members[this.selected_char_index],
                item,
                item_obj
            );
        }
    }

    item_choose(item: Item, item_obj: ItemSlot) {
        this.data.control_manager.reset();

        this.item_options_window.open(
            item_obj,
            item,
            this.data.info.party_data.members[this.selected_char_index],
            this.item_change_stats_window,
            this,
            (item_given?: boolean, char_index?: number) => {
                this.shift_item_overview(false);
                if (item_given) {
                    this.selected_char_index = char_index;
                    this.open_char_select();
                } else this.char_choose();
            },
            () => {
                if (item.type === item_types.ABILITY_GRANTOR) {
                } else if (item.type !== item_types.GENERAL_ITEM) {
                    this.item_change_stats_window.update_info(false);
                    this.item_change_stats_window.hide_arrows();
                }
            }
        );

        this.item_choose_window.deactivate();
    }

    set_guide_window_text() {
        if (this.choosing_item) {
            this.guide_window.update_text(this.guide_window_msgs.choosing_item, this.guide_window_text);
        } else {
            this.guide_window.update_text(this.guide_window_msgs.choosing_char, this.guide_window_text);
        }
    }

    set_description_window_text(description?: string, force: boolean = false, tween_if_necessary: boolean = false) {
        if (this.description_window_tween) {
            this.description_window_tween.stop();
            this.description_window_tween = null;
            this.description_window.reset_text_position(this.description_window_text);
        }
        if (this.choosing_item || force) {
            this.description_window.update_text(description, this.description_window_text);
            const pratical_text_width =
                ((numbers.TOTAL_BORDER_WIDTH + numbers.WINDOW_PADDING_H) << 1) +
                this.description_window_text.text.width +
                1;
            if (tween_if_necessary && pratical_text_width > numbers.GAME_WIDTH) {
                this.description_window.briging_border_to_top();
                const shift = -(
                    this.description_window_text.text.width -
                    numbers.GAME_WIDTH +
                    numbers.TOTAL_BORDER_WIDTH +
                    numbers.WINDOW_PADDING_H
                );
                this.description_window_tween = this.description_window.tween_text(this.description_window_text, shift);
            }
        } else {
            this.description_window.update_text(
                this.data.info.party_data.coins + "    Coins",
                this.description_window_text
            );
        }
    }

    set_item_icons() {
        this.item_overview_window.remove_from_group();
        let counter = 0;
        for (let i = 0; i < this.data.info.party_data.members[this.selected_char_index].items.length; ++i) {
            const item_obj = this.data.info.party_data.members[this.selected_char_index].items[i];
            const item_key_name = item_obj.key_name;
            if (item_key_name in this.data.info.items_list) {
                const x =
                    TOTAL_BORDER +
                    ITEM_OVERVIEW_WIN_INSIDE_PADDING_H +
                    Math.ceil(
                        (counter % ITEM_OVERVIEW_WIN_ICONS_PER_LINE) *
                            (ITEM_OVERVIEW_WIN_SPACE_BETWN_ICO + numbers.ICON_WIDTH)
                    );
                const y =
                    TOTAL_BORDER +
                    ITEM_OVERVIEW_WIN_INSIDE_PADDING_V +
                    ((counter / ITEM_OVERVIEW_WIN_ICONS_PER_LINE) | 0) *
                        (ITEM_OVERVIEW_WIN_SPACE_BETWN_LINE + numbers.ICON_HEIGHT);
                this.item_overview_window.create_at_group(x, y, "items_icons", undefined, item_key_name);
                if (item_obj.equipped) {
                    this.item_overview_window.create_at_group(
                        x + SUB_ICON_X,
                        y + SUB_ICON_Y,
                        "menu",
                        undefined,
                        "equipped"
                    );
                }
                if (item_obj.quantity > 1) {
                    const item_count = this.game.add.bitmapText(
                        x + SUB_ICON_X,
                        y + SUB_ICON_Y,
                        "gs-item-bmp-font",
                        item_obj.quantity.toString()
                    );
                    this.item_overview_window.add_sprite_to_group(item_count);
                }
                ++counter;
            }
        }
    }

    open_char_select() {
        if (this.item_choose_window.window_open) this.item_choose_window.close();
        if (this.item_change_stats_window.window_open) this.item_change_stats_window.close();

        if (!this.item_overview_window.open) this.item_overview_window.show(undefined, false);
        if (!this.arrange_window.open) this.arrange_window.show(undefined, false);
        if (!this.chars_menu.is_open) this.chars_menu.open(this.selected_char_index, CharsMenuModes.MENU);

        this.shift_item_overview(false);

        this.chars_menu.select_char(this.selected_char_index);
        this.chars_menu.grant_control(this.close_menu.bind(this), this.char_choose.bind(this));
    }

    open_menu(close_callback?: Function) {
        this.basic_info_window.open(this.data.info.party_data.members[this.selected_char_index]);

        this.close_callback = close_callback;
        this.is_open = true;

        this.set_item_icons();
        this.set_guide_window_text();
        this.set_description_window_text();

        this.guide_window.show(undefined, false);
        this.description_window.show(undefined, false);
        this.item_overview_window.show(undefined, false);
        this.arrange_window.show(undefined, false);

        this.open_char_select();
    }

    close_menu(close_menu_below: boolean = false) {
        this.data.cursor_manager.hide();
        this.data.control_manager.reset();

        this.chars_menu.close();
        this.basic_info_window.close();
        this.item_change_stats_window.close();

        this.is_open = false;

        this.guide_window.close(undefined, false);
        this.description_window.close(undefined, false);
        this.item_overview_window.close(undefined, false);
        this.arrange_window.close(undefined, false);

        if (this.close_callback !== null) {
            this.close_callback(close_menu_below);
        }
    }
}
