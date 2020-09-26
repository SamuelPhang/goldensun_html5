import * as numbers from './magic_numbers.js';
import { initialize_main_chars, main_char_list, initialize_classes, party_data } from './initializers/main_chars.js';
import { initialize_abilities, abilities_list, initialize_field_abilities, field_abilities_list } from './initializers/abilities.js';
import { initialize_items, items_list } from './initializers/items.js';
import { initialize_djinni, djinni_list } from './initializers/djinni.js';
import { initialize_enemies, enemies_list } from './initializers/enemies.js';
import { initialize_maps, load_maps, maps } from './initializers/maps.js';
import { initialize_menu } from './screens/menu.js';
import { TileEvent } from './base/tile_events/TileEvent.js';
import { Debug } from './debug.js';
import { load_all } from './initializers/assets_loader.js';
import { Collision } from './base/Collision.js';
import { directions } from './utils.js';
import { Hero } from './base/Hero.js';
import { TileEventManager } from './base/tile_events/TileEventManager.js';
import { initialize_misc_data } from './initializers/misc_data.js';
<<<<<<< HEAD
import { ShopMenuScreen } from './screens/shop_menu.js';
=======
import { GameEventManager } from './base/game_events/GameEventManager.js';
>>>>>>> master

//debugging porpouses
window.maps = maps;
window.main_char_list = main_char_list;
window.abilities_list = abilities_list;
window.items_list = items_list;
window.djinni_list = djinni_list;
window.field_abilities_list = field_abilities_list;
window.enemies_list = enemies_list;
window.party_data = party_data;

class GoldenSun {
    constructor() {
        this.game = new Phaser.Game(
            numbers.GAME_WIDTH,
            numbers.GAME_HEIGHT,
            Phaser.WEBGL,
            "game", //dom element id
            {
                preload: this.preload.bind(this),
                create: this.create.bind(this),
                update: this.update.bind(this),
                render: this.render.bind(this),
                loadRender: this.loadRender.bind(this)
            },
            false, //transparent
            false //antialias
        );

        //game states
        this.menu_open = false;
        this.in_battle = false;
        this.created = false;

        //game objects
        this.hero = null;
        this.collision = null;
        this.cursors = null;
        this.debug = null;
        this.menu_screen = null;
        this.shop_screen = null;
        this.map = null;
        this.tile_event_manager = null;
        this.game_event_manager = null;
        this.battle_instance = null;

        //common inputs
        this.enter_input = null;
        this.esc_input = null;
        this.shift_input = null;
        this.spacebar_input = null;

        //screen
        this.fullscreen = false;
        this.scale_factor = 1;

        //groups
        this.underlayer_group = null;
        this.npc_group = null;
        this.overlayer_group = null;
    }

    preload() {
        load_all(this.game);

        this.enter_input = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER).onDown;
        this.esc_input = this.game.input.keyboard.addKey(Phaser.Keyboard.ESC).onDown;
        this.shift_input = this.game.input.keyboard.addKey(Phaser.Keyboard.SHIFT).onDown;
        this.spacebar_input = this.game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown;

        this.game.time.advancedTiming = true;
        this.game.stage.smoothed = false;
        this.game.camera.roundPx = true;
        this.game.renderer.renderSession.roundPixels = true;

        this.game.camera.fade(0x0, 1);
    }

    render_loading() {
        this.game.debug.text('Loading...', 5, 15, "#00ff00");
    }

    loadRender() {
        this.render_loading();
    }

    async initialize_game_data() {
        let load_maps_promise_resolve;
        const load_maps_promise = new Promise(resolve => {
            load_maps_promise_resolve = resolve;
        });
        initialize_maps(this.game, this, this.maps_db);
        load_maps(load_maps_promise_resolve);
        await load_maps_promise;

        initialize_classes(this.classes_db);

        let load_enemies_sprites_promise_resolve;
        const load_enemies_sprites_promise = new Promise(resolve => {
            load_enemies_sprites_promise_resolve = resolve;
        });
        initialize_enemies(this.game, this.enemies_db, load_enemies_sprites_promise_resolve);
        await load_enemies_sprites_promise;

        let load_djinni_sprites_promise_resolve;
        const load_djinni_sprites_promise = new Promise(resolve => {
            load_djinni_sprites_promise_resolve = resolve;
        });
        initialize_djinni(this.game, this.djinni_db, load_djinni_sprites_promise_resolve);
        await load_djinni_sprites_promise;
        
        let load_abilities_promise_resolve;
        const load_abilities_promise = new Promise(resolve => {
            load_abilities_promise_resolve = resolve;
        });
        initialize_abilities(this.game, this.abilities_db, load_abilities_promise_resolve);
        await load_abilities_promise;
        
        let load_items_promise_resolve;
        const load_items_promise = new Promise(resolve => {
            load_items_promise_resolve = resolve;
        });
        initialize_items(this.game, this.items_db, load_items_promise_resolve);
        await load_items_promise;

        let load_chars_promise_resolve;
        const load_chars_promise = new Promise(resolve => {
            load_chars_promise_resolve = resolve;
        });
        initialize_main_chars(this.game, this.main_chars_db, load_chars_promise_resolve);
        await load_chars_promise;

        let load_misc_promise_resolve;
        const load_misc_promise = new Promise(resolve => {
            load_misc_promise_resolve = resolve;
        });
        initialize_misc_data(this.game, this.misc_animations_db, load_misc_promise_resolve);
        await load_misc_promise;

        //creating groups. Order here is important
        this.underlayer_group = this.game.add.group();
        this.npc_group = this.game.add.group();
        this.overlayer_group = this.game.add.group();

        //initialize field abilities
        initialize_field_abilities(this.game, this);

        //initialize screens
        this.menu_screen = initialize_menu(this.game, this);
        this.shop_screen = new ShopMenuScreen(this.game, this, "madra_medicine_shop");

        //configuring map layers: creating sprites, listing events and setting the layers
        this.map = await maps[this.init_db.map_key_name].mount_map(this.init_db.map_z_index);
    }

    async create() {
        // initializing some vars
        this.init_db = this.game.cache.getJSON('init_db'); 
        this.npc_db = this.game.cache.getJSON('npc_db');
        this.interactable_objects_db = this.game.cache.getJSON('interactable_objects_db');
        this.misc_animations_db = this.game.cache.getJSON('misc_animations_db');
        this.classes_db = this.game.cache.getJSON('classes_db');
        this.abilities_db = this.game.cache.getJSON('abilities_db');
        this.items_db = this.game.cache.getJSON('items_db');
        this.djinni_db = this.game.cache.getJSON('djinni_db');
        this.enemies_db = this.game.cache.getJSON('enemies_db');
        this.enemies_parties_db = this.game.cache.getJSON('enemies_parties_db');
        this.maps_db = this.game.cache.getJSON('maps_db');
        this.main_chars_db = this.game.cache.getJSON('main_chars_db');
        this.summons_db = this.game.cache.getJSON('summons_db');
        this.shopkeep_dialog_db = this.game.cache.getJSON('shopkeep_dialog_db');
        this.shops_db = this.game.cache.getJSON('shops_db');

        this.scale_factor = this.init_db.initial_scale_factor;
        party_data.coins = this.init_db.coins;

        //format some db structures
        this.shops_db = _.mapKeys(this.shops_db, shop => shop.key_name);
        this.shopkeep_dialog_db = _.mapKeys(this.shopkeep_dialog_db, shopkeep_dialog => shopkeep_dialog.key_name);
        this.interactable_objects_db = _.mapKeys(this.interactable_objects_db, interactable_object_data => interactable_object_data.key_name);
        this.enemies_parties_db = _.mapKeys(this.enemies_parties_db, enemy_party_data => enemy_party_data.key_name);
        this.npc_db = _.mapKeys(this.npc_db, npc_data => npc_data.key_name);
        this.summons_db = _.mapKeys(this.summons_db, (summon_data, index) => {
            summon_data.index = parseInt(index);
            return summon_data.key_name;
        });

        //init debug instance
        this.debug = new Debug(this.game, this);
        //init debug controls
        this.debug.initialize_controls();

        await this.initialize_game_data();

        //initializes the controllable hero
        this.hero = new Hero(
            this.game,
            this,
            this.init_db.hero_key_name,
            this.init_db.x_tile_position,
            this.init_db.y_tile_position,
            this.init_db.initial_action,
            directions[this.init_db.initial_direction]
        );
        this.hero.set_sprite(this.npc_group, main_char_list[this.hero.key_name].sprite_base, this.map.sprite, this.map.collision_layer);
        this.hero.set_shadow('shadow', this.npc_group, this.map.collision_layer);
        this.hero.camera_follow();
        this.hero.play();

        //initializes collision system
        this.collision = new Collision(this.game, this.hero);
        this.hero.config_body(this.collision);
        this.collision.config_collision_groups(this.map);
        this.map.config_all_bodies(this.collision, this.map.collision_layer);
        this.collision.config_collisions(this.map, this.map.collision_layer, this.npc_group);
        this.game.physics.p2.updateBoundsCollisionGroup();

        this.initialize_game_main_controls();

        this.tile_event_manager = new TileEventManager(this.game, this, this.hero, this.collision);
        this.game_event_manager = new GameEventManager(this.game, this);

        //set keyboard cursors
        this.cursors = this.game.input.keyboard.createCursorKeys();

        this.created = true;
        this.game.camera.resetFX();
    }

    initialize_game_main_controls() {
        //set initial zoom
        this.game.scale.setupScale(this.scale_factor * numbers.GAME_WIDTH, this.scale_factor * numbers.GAME_HEIGHT);
        window.dispatchEvent(new Event('resize'));

        //enable full screen
        this.game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.game.input.onTap.add((pointer, is_double_click) => {
            if (is_double_click) {
                this.game.scale.startFullScreen(true);
            }
        });
        this.game.scale.onFullScreenChange.add(() => {
            this.fullscreen = !this.fullscreen;
            this.scale_factor = 1;
            this.game.scale.setupScale(numbers.GAME_WIDTH, numbers.GAME_HEIGHT);
            window.dispatchEvent(new Event('resize'));
        });

        //enable zoom
        this.game.input.keyboard.addKey(Phaser.Keyboard.ONE).onDown.add(() => {
            if (this.fullscreen) return;
            this.scale_factor = 1;
            this.game.scale.setupScale(numbers.GAME_WIDTH, numbers.GAME_HEIGHT);
            window.dispatchEvent(new Event('resize'));
        });
        this.game.input.keyboard.addKey(Phaser.Keyboard.TWO).onDown.add(() => {
            if (this.fullscreen) return;
            this.scale_factor = 2;
            this.game.scale.setupScale(this.scale_factor * numbers.GAME_WIDTH, this.scale_factor * numbers.GAME_HEIGHT);
            window.dispatchEvent(new Event('resize'));
        });
        this.game.input.keyboard.addKey(Phaser.Keyboard.THREE).onDown.add(() => {
            if (this.fullscreen) return;
            this.scale_factor = 3;
            this.game.scale.setupScale(this.scale_factor * numbers.GAME_WIDTH, this.scale_factor * numbers.GAME_HEIGHT);
            window.dispatchEvent(new Event('resize'));
        });

        //enable psynergies shortcuts for testing
        this.game.input.keyboard.addKey(Phaser.Keyboard.Q).onDown.add(() => {
            if (this.hero.in_action() || this.menu_open || this.in_battle) return;
            field_abilities_list.move.cast(this.hero, this.init_db.initial_shortcuts.move);
        });
        this.game.input.keyboard.addKey(Phaser.Keyboard.W).onDown.add(() => {
            if (this.hero.in_action() || this.menu_open || this.in_battle) return;
            field_abilities_list.frost.cast(this.hero, this.init_db.initial_shortcuts.frost);
        });
        this.game.input.keyboard.addKey(Phaser.Keyboard.E).onDown.add(() => {
            if (this.hero.in_action() || this.menu_open || this.in_battle) return;
            field_abilities_list.growth.cast(this.hero, this.init_db.initial_shortcuts.growth);
        });
<<<<<<< HEAD
        this.game.input.keyboard.addKey(Phaser.Keyboard.S).onDown.add(() => {
            if (this.hero.in_action() || this.menu_open || this.in_battle) return;
            this.shop_screen.open_menu("madra_medicine_shop");
        });

        //enable event trigger key
        this.enter_input.add(() => {
            if (this.hero.in_action() || this.in_battle || !this.created) return;
            trigger_npc_dialog(this.game, this);
        });
=======
>>>>>>> master
    }

    update() {
        if (!this.created) {
            this.render_loading();
            return;
        }
        if (!this.tile_event_manager.on_event && !this.game_event_manager.on_event && !this.hero.pushing && !this.menu_open && !this.hero.casting_psynergy && !this.in_battle) {
            this.hero.update_tile_position(this.map.sprite);

            this.tile_event_manager.fire_triggered_events();
            const location_key = TileEvent.get_location_key(this.hero.tile_x_pos, this.hero.tile_y_pos);
            if (location_key in this.map.events) { //check if the actual tile has an event
                this.tile_event_manager.check_tile_events(location_key, this.map);
            }

            this.hero.update(this.map); //update hero position/velocity/sprite
            this.map.update(); //update map and its objects position/velocity/sprite
        } else {
            this.hero.stop_char(false);
            if (this.hero.pushing) {
                this.hero.set_action();
            }else if (this.menu_open && this.menu_screen.horizontal_menu.menu_active) {
                this.menu_screen.update_position();
            } else if (this.in_battle) {
                this.battle_instance.update();
            }
        }
    }

    render() {
        this.debug.set_debug_info();
        if (this.game.time.frames%8 === 0) {
            this.debug.fill_key_debug_table();
        }
        if (this.game.time.frames%(numbers.TARGET_FPS >> 1) === 0) {
            this.debug.fill_stats_debug_table();
        }
    }
}

var golden_sun = new GoldenSun();

//debugging porpouses
window.game = golden_sun.game;
window.data = golden_sun;
