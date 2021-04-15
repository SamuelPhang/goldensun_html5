import {Battle} from "../battle/Battle";
import {GameEvent, event_types} from "./GameEvent";

export class BattleEvent extends GameEvent {
    private background_key: string;
    private enemy_party_key: string;
    private battle: Battle;
    private finish_callback: (victory: boolean) => void;

    constructor(game, data, active, background_key, enemy_party_key) {
        super(game, data, event_types.BATTLE, active);
        this.background_key = background_key;
        this.enemy_party_key = enemy_party_key;
    }

    _fire() {
        if (!this.active) return;
        ++this.data.game_event_manager.events_running_count;
        this.battle = new Battle(this.game, this.data, this.background_key, this.enemy_party_key, victory => {
            --this.data.game_event_manager.events_running_count;
            if (this.finish_callback) {
                this.finish_callback(victory);
            }
        });
        this.battle.start_battle();
    }

    assign_finish_callback(callback: BattleEvent["finish_callback"]) {
        this.finish_callback = callback;
    }

    destroy() {
        this.origin_npc = null;
        this.battle = null;
    }
}
